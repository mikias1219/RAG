export interface WorkflowRule {
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
}

export interface MatchedWorkflowRule {
  index: number;
  rule: WorkflowRule;
}

export interface Workflow {
  id: string;
  tenantId: string;
  workspaceId?: string;
  name: string;
  description?: string;
  rules: WorkflowRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowService {
  async createWorkflow(
    tenantId: string,
    workspaceId: string | undefined,
    data: { name: string; description?: string; rules: WorkflowRule[] }
  ): Promise<Workflow> {
    return {
      id: `workflow-${Date.now()}`,
      tenantId,
      workspaceId,
      name: data.name,
      description: data.description,
      rules: data.rules,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async evaluateWorkflow(workflow: Workflow, context: Record<string, unknown>): Promise<boolean> {
    return this.findMatchedRules(workflow, context).length > 0;
  }

  findMatchedRules(workflow: Workflow, context: Record<string, unknown>): MatchedWorkflowRule[] {
    if (!workflow.enabled) return [];

    const matched: MatchedWorkflowRule[] = [];
    for (const [index, rule] of workflow.rules.entries()) {
      if (this.evaluateCondition(rule.condition, context)) {
        matched.push({ index, rule });
      }
    }
    return matched;
  }

  private evaluateCondition(condition: Record<string, unknown>, context: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(condition)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
