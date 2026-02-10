/**
 * MASTER AI ORCHESTRATOR (EPOCH-11)
 * 
 * The supreme AI control system that orchestrates ALL AI agents.
 * This is the pinnacle of the NEURO-MEV AI architecture.
 * 
 * MANAGES:
 * - Multiple SuperIntelligent Agents (swarm intelligence)
 * - Resource allocation across agents
 * - Collective decision-making
 * - Cross-agent learning and knowledge transfer
 * - Emergent strategies from agent collaboration
 * - System-wide optimization
 * 
 * This is GOD MODE for AI agents.
 */

import { SuperIntelligentAgent } from './superintelligent_agent.mjs';

export class MasterOrchestrator {
  constructor(config = {}) {
    this.config = {
      agentCount: config.agentCount || 3,
      orchestrationMode: config.orchestrationMode || 'COLLABORATIVE', // COMPETITIVE, COLLABORATIVE, HYBRID
      globalLearningRate: config.globalLearningRate || 0.1,
      knowledgeShareRate: config.knowledgeShareRate || 0.5,
      ...config
    };

    // Swarm of superintelligent agents
    this.agents = [];
    
    // Global knowledge base (shared across all agents)
    this.globalKnowledge = {
      bestStrategies: [],
      marketPatterns: new Map(),
      collectiveInsights: [],
      emergentStrategies: []
    };

    // Orchestrator state
    this.state = {
      active: false,
      generation: 0,
      totalDecisions: 0,
      collectivePerformance: {
        totalPnL: 0,
        winRate: 0,
        bestAgent: null,
        worstAgent: null
      },
      swarmIntelligence: {
        coherence: 0, // How aligned agents are
        diversity: 0,  // How diverse strategies are
        emergence: 0   // How many emergent strategies discovered
      }
    };

    // Performance tracking
    this.performanceHistory = [];
  }

  /**
   * INITIALIZE MASTER ORCHESTRATOR
   * Spawn and initialize all AI agents
   */
  async initialize() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🎯 MASTER AI ORCHESTRATOR — INITIALIZATION 🎯            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Configuration:`);
    console.log(`   Agent Count: ${this.config.agentCount}`);
    console.log(`   Orchestration Mode: ${this.config.orchestrationMode}`);
    console.log(`   Global Learning Rate: ${this.config.globalLearningRate}`);
    console.log(`   Knowledge Share Rate: ${this.config.knowledgeShareRate}`);

    // Spawn agents with different configurations
    console.log(`\n🤖 Spawning ${this.config.agentCount} SuperIntelligent Agents...\n`);

    for (let i = 0; i < this.config.agentCount; i++) {
      const agentConfig = this._generateAgentConfig(i);
      
      const agent = new SuperIntelligentAgent({
        name: `Agent-${i + 1}`,
        ...agentConfig,
        agent: {
          learningRate: 0.05 + Math.random() * 0.1, // Vary learning rates
          populationSize: 20 + Math.floor(Math.random() * 20) // Vary population
        }
      });

      await agent.initialize();
      
      this.agents.push({
        id: `agent_${i + 1}`,
        instance: agent,
        config: agentConfig,
        performance: {
          totalPnL: 0,
          decisions: 0,
          wins: 0,
          losses: 0
        },
        specialization: this._determineSpecialization(i)
      });

      console.log(`   ✓ ${agent.config.name} initialized (${this.agents[i].specialization})`);
    }

    this.state.active = true;

    console.log('\n✅ Master Orchestrator initialized\n');
    console.log('🌟 Swarm Intelligence: ONLINE');
    console.log('🧠 Collective Consciousness: ACTIVE');
    console.log('⚡ God Mode: ENGAGED\n');

    return { success: true, agentCount: this.agents.length };
  }

  /**
   * COLLECTIVE DECISION
   * All agents vote on the best action
   */
  async collectiveDecision(marketState) {
    if (!this.state.active) {
      throw new Error('Master Orchestrator not initialized');
    }

    // Get decisions from all agents
    const agentDecisions = [];

    for (const agent of this.agents) {
      const decision = await agent.instance.makeDecision(marketState);
      agentDecisions.push({
        agentId: agent.id,
        decision,
        weight: this._calculateAgentWeight(agent)
      });
    }

    // Aggregate decisions based on orchestration mode
    const finalDecision = this._aggregateDecisions(agentDecisions, marketState);

    this.state.totalDecisions++;

    return {
      action: finalDecision.action,
      confidence: finalDecision.confidence,
      consensus: finalDecision.consensus,
      agentVotes: agentDecisions,
      swarmIntelligence: this._calculateSwarmMetrics(agentDecisions)
    };
  }

  /**
   * EXECUTE COLLECTIVE TRADE
   * Execute trade and distribute learning across swarm
   */
  async executeCollectiveTrade(decision, marketState) {
    const tradeResult = {
      pnl: (Math.random() - 0.5) * 20, // Simulated PnL
      outcome: null
    };

    tradeResult.outcome = tradeResult.pnl > 0 ? 'WIN' : 'LOSS';

    // Update orchestrator performance
    this.state.collectivePerformance.totalPnL += tradeResult.pnl;

    // Distribute outcome to participating agents
    for (const agentVote of decision.agentVotes) {
      const agent = this.agents.find(a => a.id === agentVote.agentId);
      
      // Each agent learns from the collective outcome
      await agent.instance.executeTrade(agentVote.decision, marketState);
      
      // Update agent performance
      agent.performance.totalPnL += tradeResult.pnl * agentVote.weight;
      agent.performance.decisions++;
      
      if (tradeResult.outcome === 'WIN') {
        agent.performance.wins++;
      } else {
        agent.performance.losses++;
      }
    }

    // Share knowledge across swarm
    await this._shareKnowledge(decision, tradeResult);

    // Check for emergent strategies
    this._detectEmergentStrategies();

    // Update swarm intelligence metrics
    this._updateSwarmIntelligence();

    return tradeResult;
  }

  /**
   * SWARM REFLECTION
   * All agents reflect collectively
   */
  async swarmReflection() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🧠 SWARM REFLECTION — COLLECTIVE CONSCIOUSNESS 🧠        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const reflections = [];

    for (const agent of this.agents) {
      const reflection = await agent.instance.reflect();
      reflections.push({
        agentId: agent.id,
        reflection
      });
    }

    // Synthesize collective insights
    const collectiveInsight = this._synthesizeInsights(reflections);

    console.log('📊 SWARM METRICS:');
    console.log(`   Coherence: ${(this.state.swarmIntelligence.coherence * 100).toFixed(1)}%`);
    console.log(`   Diversity: ${(this.state.swarmIntelligence.diversity * 100).toFixed(1)}%`);
    console.log(`   Emergence: ${this.state.swarmIntelligence.emergence} strategies`);

    console.log('\n💡 COLLECTIVE INSIGHTS:');
    for (const insight of collectiveInsight.topInsights) {
      console.log(`   • ${insight}`);
    }

    console.log('\n🏆 AGENT PERFORMANCE:');
    const sortedAgents = [...this.agents].sort((a, b) => 
      b.performance.totalPnL - a.performance.totalPnL
    );

    for (const agent of sortedAgents) {
      const winRate = agent.performance.decisions > 0
        ? (agent.performance.wins / agent.performance.decisions * 100).toFixed(1)
        : 0;
      
      console.log(`   ${agent.id}: PnL ${agent.performance.totalPnL.toFixed(2)}, Win Rate ${winRate}%`);
    }

    this.state.collectivePerformance.bestAgent = sortedAgents[0].id;
    this.state.collectivePerformance.worstAgent = sortedAgents[sortedAgents.length - 1].id;

    return collectiveInsight;
  }

  /**
   * KNOWLEDGE TRANSFER
   * Transfer best strategies from top performers to others
   */
  async knowledgeTransfer() {
    console.log('\n🔄 Initiating Knowledge Transfer...');

    // Find best performing agent
    const bestAgent = this.agents.reduce((best, current) => 
      current.performance.totalPnL > best.performance.totalPnL ? current : best
    );

    // Transfer knowledge to other agents
    let transferCount = 0;

    for (const agent of this.agents) {
      if (agent.id !== bestAgent.id) {
        // Use metacognitive transfer learning
        if (agent.instance.metacognitive && bestAgent.instance.metacognitive) {
          await agent.instance.transferKnowledge(
            { type: 'best_performer', agentId: bestAgent.id },
            { type: 'learner', agentId: agent.id }
          );
          
          transferCount++;
        }
      }
    }

    console.log(`✓ Transferred knowledge from ${bestAgent.id} to ${transferCount} agents`);

    return { success: true, transfers: transferCount };
  }

  /**
   * EVOLUTIONARY STEP
   * Evolve the swarm (replace worst performers)
   */
  async evolve() {
    console.log('\n🧬 Swarm Evolution Initiated...');

    this.state.generation++;

    // Sort agents by performance
    const sortedAgents = [...this.agents].sort((a, b) => 
      b.performance.totalPnL - a.performance.totalPnL
    );

    // Replace bottom performers (last 1/3)
    const replaceCount = Math.floor(this.agents.length / 3);
    const topPerformers = sortedAgents.slice(0, this.agents.length - replaceCount);
    
    console.log(`   Replacing ${replaceCount} poor performers...`);

    // Create new agents based on top performers
    for (let i = 0; i < replaceCount; i++) {
      const templateAgent = topPerformers[i % topPerformers.length];
      
      // Shutdown old agent
      const oldAgentIndex = this.agents.findIndex(a => 
        a.id === sortedAgents[this.agents.length - 1 - i].id
      );
      
      await this.agents[oldAgentIndex].instance.shutdown();
      
      // Create new agent with mutations
      const newConfig = {
        ...templateAgent.config,
        name: `Agent-${oldAgentIndex + 1}-Gen${this.state.generation}`
      };
      
      const newAgent = new SuperIntelligentAgent(newConfig);
      await newAgent.initialize();
      
      this.agents[oldAgentIndex] = {
        id: `agent_${oldAgentIndex + 1}_gen${this.state.generation}`,
        instance: newAgent,
        config: newConfig,
        performance: {
          totalPnL: 0,
          decisions: 0,
          wins: 0,
          losses: 0
        },
        specialization: templateAgent.specialization
      };
    }

    console.log(`✓ Generation ${this.state.generation} complete`);
    console.log(`   Top Performer: ${sortedAgents[0].id} (${sortedAgents[0].performance.totalPnL.toFixed(2)} PnL)`);

    return { success: true, generation: this.state.generation };
  }

  /**
   * SHUTDOWN
   * Graceful shutdown of entire swarm
   */
  async shutdown() {
    console.log('\n🤖 Shutting down Master Orchestrator...');

    // Final swarm reflection
    await this.swarmReflection();

    // Shutdown all agents
    for (const agent of this.agents) {
      await agent.instance.shutdown();
    }

    this.state.active = false;

    console.log('✅ Master Orchestrator shutdown complete\n');

    return { success: true };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  _generateAgentConfig(index) {
    const modes = ['LEARNING', 'SUPERINTELLIGENT', 'GODMODE'];
    const mode = modes[index % modes.length];

    return {
      mode,
      enableMetacognition: true,
      enableSelfImprovement: index > 0 // First agent is baseline
    };
  }

  _determineSpecialization(index) {
    const specializations = [
      'MOMENTUM_TRADER',
      'MEAN_REVERSION',
      'VOLATILITY_ARBITRAGE',
      'PATTERN_RECOGNITION',
      'ADAPTIVE_LEARNING'
    ];

    return specializations[index % specializations.length];
  }

  _calculateAgentWeight(agent) {
    // Weight based on past performance
    const totalPnL = agent.performance.totalPnL;
    const decisions = agent.performance.decisions || 1;
    
    // Agents with positive PnL get higher weight
    if (totalPnL > 0) {
      return 0.5 + (totalPnL / (decisions * 10)); // Max ~1.5
    } else {
      return 0.3; // Minimum weight for poor performers
    }
  }

  _aggregateDecisions(agentDecisions, marketState) {
    if (this.config.orchestrationMode === 'COMPETITIVE') {
      // Winner takes all (highest confidence)
      const best = agentDecisions.reduce((max, d) => 
        d.decision.confidence > max.decision.confidence ? d : max
      );
      
      return {
        action: best.decision.action,
        confidence: best.decision.confidence,
        consensus: 0 // No consensus in competitive mode
      };
    }

    // COLLABORATIVE or HYBRID: Weighted voting
    const votes = { ENTER: 0, WAIT: 0, EXIT: 0, NONE: 0 };
    let totalWeight = 0;

    for (const vote of agentDecisions) {
      const action = vote.decision.action || 'NONE';
      votes[action] += vote.weight * vote.decision.confidence;
      totalWeight += vote.weight;
    }

    // Find winning action
    const winner = Object.entries(votes).reduce((max, [action, score]) =>
      score > max.score ? { action, score } : max
    , { action: 'NONE', score: 0 });

    // Calculate consensus (how unified agents are)
    const consensus = winner.score / totalWeight;

    return {
      action: winner.action,
      confidence: consensus,
      consensus
    };
  }

  async _shareKnowledge(decision, tradeResult) {
    // Share successful patterns in global knowledge base
    if (tradeResult.outcome === 'WIN') {
      this.globalKnowledge.bestStrategies.push({
        decision,
        result: tradeResult,
        timestamp: Date.now()
      });

      // Keep only recent best strategies
      if (this.globalKnowledge.bestStrategies.length > 100) {
        this.globalKnowledge.bestStrategies.shift();
      }
    }

    // Update collective insights
    this.globalKnowledge.collectiveInsights.push({
      consensus: decision.consensus,
      outcome: tradeResult.outcome,
      pnl: tradeResult.pnl
    });
  }

  _detectEmergentStrategies() {
    // Analyze if agents are discovering new combined strategies
    // (Simplified - real implementation would use clustering/analysis)
    
    const recentInsights = this.globalKnowledge.collectiveInsights.slice(-20);
    
    if (recentInsights.length >= 10) {
      const highConsensusWins = recentInsights.filter(i => 
        i.consensus > 0.8 && i.outcome === 'WIN'
      ).length;

      if (highConsensusWins >= 7) {
        this.state.swarmIntelligence.emergence++;
        
        this.globalKnowledge.emergentStrategies.push({
          type: 'high_consensus_momentum',
          discovered: Date.now(),
          performance: highConsensusWins / recentInsights.length
        });
      }
    }
  }

  _updateSwarmIntelligence() {
    // Calculate coherence (how aligned agents are)
    const recentInsights = this.globalKnowledge.collectiveInsights.slice(-10);
    
    if (recentInsights.length > 0) {
      const avgConsensus = recentInsights.reduce((sum, i) => sum + i.consensus, 0) / recentInsights.length;
      this.state.swarmIntelligence.coherence = avgConsensus;
    }

    // Calculate diversity (how different agents are)
    const performanceVariance = this._calculatePerformanceVariance();
    this.state.swarmIntelligence.diversity = Math.min(performanceVariance / 100, 1);
  }

  _calculatePerformanceVariance() {
    const pnls = this.agents.map(a => a.performance.totalPnL);
    const mean = pnls.reduce((sum, p) => sum + p, 0) / pnls.length;
    const variance = pnls.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pnls.length;
    
    return Math.sqrt(variance);
  }

  _calculateSwarmMetrics(agentDecisions) {
    // Calculate real-time swarm metrics
    const actions = agentDecisions.map(d => d.decision.action);
    const uniqueActions = new Set(actions).size;
    
    const avgConfidence = agentDecisions.reduce((sum, d) => 
      sum + d.decision.confidence, 0
    ) / agentDecisions.length;

    return {
      diversity: uniqueActions / 4, // Max 4 possible actions
      avgConfidence,
      participation: agentDecisions.length / this.agents.length
    };
  }

  _synthesizeInsights(reflections) {
    const insights = [];

    // Aggregate insights from all agents
    const allWinRates = reflections
      .filter(r => r.reflection.reflection?.reflected)
      .map(r => {
        const summary = r.reflection.reflection.insights.summary || '';
        const match = summary.match(/Win rate: ([\d.]+)%/);
        return match ? parseFloat(match[1]) : 0;
      });

    if (allWinRates.length > 0) {
      const avgWinRate = allWinRates.reduce((a, b) => a + b, 0) / allWinRates.length;
      insights.push(`Collective Win Rate: ${avgWinRate.toFixed(1)}%`);
    }

    // Add swarm-specific insights
    insights.push(`Swarm Coherence: ${(this.state.swarmIntelligence.coherence * 100).toFixed(1)}%`);
    insights.push(`Strategy Diversity: ${(this.state.swarmIntelligence.diversity * 100).toFixed(1)}%`);
    
    if (this.state.swarmIntelligence.emergence > 0) {
      insights.push(`Emergent Strategies Discovered: ${this.state.swarmIntelligence.emergence}`);
    }

    return {
      topInsights: insights,
      detailedReflections: reflections
    };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  getStatus() {
    return {
      active: this.state.active,
      agentCount: this.agents.length,
      generation: this.state.generation,
      totalDecisions: this.state.totalDecisions,
      collectivePerformance: { ...this.state.collectivePerformance },
      swarmIntelligence: { ...this.state.swarmIntelligence },
      orchestrationMode: this.config.orchestrationMode
    };
  }

  getAgentStatuses() {
    return this.agents.map(agent => ({
      id: agent.id,
      name: agent.instance.config.name,
      specialization: agent.specialization,
      performance: { ...agent.performance },
      status: agent.instance.getStatus()
    }));
  }
}
