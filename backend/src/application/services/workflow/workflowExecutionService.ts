import { randomUUID } from "crypto";
import { getPrisma } from "@/infrastructure/db/prismaClient";
import { badRequest } from "@/domain/errors/AppError";
import type { AgentService } from "@/application/services/workflow/agentService";
import type { Workflow, WorkflowService } from "@/application/services/workflow/workflowService";

type ExecuteInput = {
  workflowId: string;
  tenantId: string;
  workspaceId?: string | null;
  context: Record<string, unknown>;
  triggeredBy: string;
};

type ExecuteResult = {
  workflowId: string;
  runId: string;
  matched: boolean;
  matchedRuleIndexes: number[];
  status: "completed" | "failed";
  steps: Array<{ type: string; status: "completed" | "failed" }>;
};

export class WorkflowExecutionService {
  constructor(
    private readonly deps: {
      workflowService: WorkflowService;
      agentService: AgentService;
    }
  ) {}

  async execute(input: ExecuteInput): Promise<ExecuteResult> {
    const prisma = getPrisma();
    const row = await prisma.workflow.findFirst({
      where: { id: input.workflowId, tenantId: input.tenantId }
    });
    if (!row) throw badRequest("Workflow not found");

    const workflow: Workflow = {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId ?? undefined,
      name: row.name,
      description: row.description ?? undefined,
      rules: JSON.parse(row.rulesJson),
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    const matched = this.deps.workflowService.findMatchedRules(workflow, input.context);
    const runId = randomUUID();
    const run = await prisma.workflowRun.create({
      data: {
        id: runId,
        workflowId: workflow.id,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId ?? null,
        status: "running",
        triggerEvent: input.triggeredBy,
        contextJson: JSON.stringify(input.context),
        startedAt: new Date()
      }
    });

    const steps: Array<{ type: string; status: "completed" | "failed" }> = [];

    try {
      for (const matchedRule of matched) {
        const actionType = String(matchedRule.rule.action.type ?? "").trim();
        if (actionType !== "run_agent") {
          continue;
        }
        const agentId = String(matchedRule.rule.action.agentId ?? "").trim();
        if (!agentId) {
          throw badRequest("run_agent action requires action.agentId");
        }
        const agent = this.deps.agentService.getAgent(agentId);
        if (!agent) {
          throw badRequest(`Unknown agent "${agentId}"`);
        }
        const output = await this.deps.agentService.executeAgent(agent, input.context);
        await prisma.workflowRunStep.create({
          data: {
            id: randomUUID(),
            runId: run.id,
            stepType: "run_agent",
            status: "completed",
            inputJson: JSON.stringify({ agentId, ruleIndex: matchedRule.index }),
            outputJson: JSON.stringify(output),
            startedAt: new Date(),
            completedAt: new Date()
          }
        });
        steps.push({ type: "run_agent", status: "completed" });
      }

      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          error: null
        }
      });
      return {
        workflowId: workflow.id,
        runId: run.id,
        matched: matched.length > 0,
        matchedRuleIndexes: matched.map((m) => m.index),
        status: "completed",
        steps
      };
    } catch (error: any) {
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          error: error?.message ?? "Workflow execution failed"
        }
      });
      await prisma.workflowRunStep.create({
        data: {
          id: randomUUID(),
          runId: run.id,
          stepType: "run_agent",
          status: "failed",
          inputJson: JSON.stringify({ matchedRuleIndexes: matched.map((m) => m.index) }),
          outputJson: JSON.stringify({}),
          error: error?.message ?? "Workflow execution failed",
          startedAt: new Date(),
          completedAt: new Date()
        }
      });
      throw error;
    }
  }
}
