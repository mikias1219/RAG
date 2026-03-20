export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  role: 'data_analyst' | 'risk_analyst' | 'operations';
  tools: Tool[];
  systemPrompt: string;
}

export class AgentService {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.initializeDefaultAgents();
  }

  private initializeDefaultAgents() {
    const dataAnalystAgent: Agent = {
      id: 'data-analyst',
      name: 'Data Analyst',
      description: 'Analyzes data and provides insights',
      role: 'data_analyst',
      tools: [
        { name: 'query_documents', description: 'Query indexed documents', parameters: { query: 'string' } },
        { name: 'calculate_metrics', description: 'Calculate metrics from data', parameters: { data: 'array' } }
      ],
      systemPrompt:
        'You are a data analyst. Analyze the provided data and generate actionable insights.'
    };

    const riskAgent: Agent = {
      id: 'risk-analyst',
      name: 'Risk Analyst',
      description: 'Identifies and assesses risks',
      role: 'risk_analyst',
      tools: [
        { name: 'assess_risk', description: 'Assess risk factors', parameters: { context: 'string' } },
        { name: 'get_risk_history', description: 'Get historical risk data', parameters: {} }
      ],
      systemPrompt: 'You are a risk analyst. Identify potential risks and provide mitigation strategies.'
    };

    const opsAgent: Agent = {
      id: 'operations',
      name: 'Operations Manager',
      description: 'Manages operational workflows',
      role: 'operations',
      tools: [
        { name: 'execute_workflow', description: 'Execute a workflow', parameters: { workflowId: 'string' } },
        { name: 'get_status', description: 'Get operational status', parameters: {} }
      ],
      systemPrompt: 'You are an operations manager. Ensure smooth execution of workflows and processes.'
    };

    this.agents.set('data-analyst', dataAnalystAgent);
    this.agents.set('risk-analyst', riskAgent);
    this.agents.set('operations', opsAgent);
  }

  getAgent(agentId: string): Agent | null {
    return this.agents.get(agentId) || null;
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  async executeAgent(
    agent: Agent,
    context: Record<string, unknown>
  ): Promise<{ response: string; toolCalls: Array<{ tool: string; args: Record<string, unknown> }> }> {
    const toolCalls: Array<{ tool: string; args: Record<string, unknown> }> = [];
    const response = `Agent ${agent.name} processed context and identified ${agent.tools.length} relevant tools.`;

    return { response, toolCalls };
  }
}
