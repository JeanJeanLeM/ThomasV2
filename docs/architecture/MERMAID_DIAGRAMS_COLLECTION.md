# 🏗️ Thomas V2 - Complete Mermaid Diagrams Collection

This document contains all Mermaid diagrams from the Thomas V2 documentation, organized by category and file source.

## 🎨 **Contrast Improvements**
All diagrams have been updated with **high-contrast color schemes**:
- **Dark backgrounds** with **white text** for optimal readability
- **Blue** (#1976d2) for input/processing elements
- **Orange** (#f57c00) for intermediate actions
- **Green** (#2e7d32, #4caf50) for success/completion states
- **Red** (#d32f2f) for errors/failures
- **Purple** (#7b1fa2) for AI/external services

---

## 🤖 AI Agent & Chat System Diagrams

### **1.1 Thomas Agent Core Architecture**
**Source**: `docs/AGENT_TOOLS_CREATED.md`
**Description**: Complete architecture of the Thomas Agent with all tools, matching services, and database integration

```mermaid
graph TB
    subgraph "🤖 Thomas Agent Core"
        Agent[ThomasAgentService]
        Registry[ToolRegistry]
        Context[AgentContextService]
    end

    subgraph "🛠️ Agent Tools Créés"
        subgraph "🌾 Agricultural Tools"
            Obs[👁️ ObservationTool<br/>✅ CRÉÉ]
            TaskDone[✅ TaskDoneTool<br/>✅ CRÉÉ]
            TaskPlan[📅 TaskPlannedTool<br/>✅ CRÉÉ]
            Harvest[🌾 HarvestTool<br/>✅ CRÉÉ]
        end

        subgraph "🏗️ Management Tools"
            PlotTool[🏗️ PlotTool<br/>✅ CRÉÉ]
        end

        subgraph "❓ Utility Tools"
            Help[❓ HelpTool<br/>✅ CRÉÉ]
        end
    end

    subgraph "🎯 Matching Services"
        PlotMatch[PlotMatchingService<br/>✅ Phase 3]
        MatMatch[MaterialMatchingService<br/>✅ Phase 3]
        ConvMatch[ConversionMatchingService<br/>✅ Phase 3]
    end

    subgraph "🗄️ Database Tables"
        StagingTable[(chat_analyzed_actions<br/>✅ Staging unifiée)]
        TasksTable[(tasks<br/>✅ Source vérité)]
        ObsTable[(observations<br/>✅ Source vérité)]
    end

    Agent --> Registry
    Registry --> Obs
    Registry --> TaskDone
    Registry --> TaskPlan
    Registry --> Harvest
    Registry --> PlotTool
    Registry --> Help

    Obs --> PlotMatch
    TaskDone --> PlotMatch
    TaskDone --> MatMatch
    TaskDone --> ConvMatch
    TaskPlan --> PlotMatch
    TaskPlan --> MatMatch
    Harvest --> PlotMatch
    Harvest --> ConvMatch
    PlotTool --> PlotMatch

    Obs --> StagingTable
    TaskDone --> StagingTable
    TaskPlan --> StagingTable
    Harvest --> StagingTable

    StagingTable --> TasksTable
    StagingTable --> ObsTable

    %% Style nested subgraphs to avoid white-on-white
    style "🌾 Agricultural Tools" fill:#2e7d32,color:#ffffff,stroke:#1b5e20,stroke-width:2px
    style "🏗️ Management Tools" fill:#2e7d32,color:#ffffff,stroke:#1b5e20,stroke-width:2px
    style "❓ Utility Tools" fill:#2e7d32,color:#ffffff,stroke:#1b5e20,stroke-width:2px

    style Obs fill:#4caf50,color:#ffffff
    style TaskDone fill:#4caf50,color:#ffffff
    style TaskPlan fill:#4caf50,color:#ffffff
    style Harvest fill:#4caf50,color:#ffffff
    style PlotTool fill:#4caf50,color:#ffffff
    style Help fill:#4caf50,color:#ffffff
```

---

### **1.2 AI Analysis Data Flow**
**Source**: `docs/THOMAS_AGENT_ROADMAP.md`
**Description**: Flow of AI message analysis from input to database storage

```mermaid
flowchart TD
    Message[👤 Message Utilisateur] --> Analysis[🧠 chat_message_analyses<br/>Parsing IA]

    Analysis --> Actions[📋 chat_analyzed_actions<br/>Actions parsées + staging]

    Actions --> Validation{✅ Validation<br/>+ Matching}

    Validation -->|Task Done/Planned| TaskCreate[📝 INSERT INTO tasks<br/>table existante]
    Validation -->|Observation| ObsCreate[👁️ INSERT INTO observations<br/>table existante]
    Validation -->|❌ Error| ErrorLog[❌ Error dans analyzed_actions]

    TaskCreate --> TaskRecord[(📊 tasks<br/>Source de vérité)]
    ObsCreate --> ObsRecord[(👁️ observations<br/>Source de vérité)]

    Actions -.->|Référence| TaskRecord
    Actions -.->|Référence| ObsRecord

    style Analysis fill:#1976d2,color:#ffffff
    style Actions fill:#f57c00,color:#ffffff
    style TaskRecord fill:#2e7d32,color:#ffffff
    style ObsRecord fill:#2e7d32,color:#ffffff
    style ErrorLog fill:#d32f2f,color:#ffffff
```

---

### **1.3 Database Architecture - AI Tables**
**Source**: `docs/THOMAS_AGENT_ROADMAP.md`
**Description**: Relationship between AI tables and existing source-of-truth tables

```mermaid
graph TB
    subgraph "✅ Tables IA Core"
        Prompts[(chat_prompts<br/>Prompts versionnés)]
        Analyses[(chat_message_analyses<br/>Résultats analyse)]
        Actions[(chat_analyzed_actions<br/>Staging unifiée)]
        Executions[(chat_agent_executions<br/>Logs exécution)]
    end

    subgraph "✅ Tables Existantes (Source Vérité)"
        Tasks[(tasks<br/>Tâches réalisées/planifiées)]
        Observations[(observations<br/>Constats terrain)]
        Plots[(plots + surface_units<br/>Parcelles)]
        Materials[(materials<br/>Matériels)]
        Conversions[(user_conversion_units<br/>Conversions)]
    end

    Analyses --> Actions
    Actions --> Tasks
    Actions --> Observations
    Actions -.-> Plots
    Actions -.-> Materials
    Actions -.-> Conversions

    style Actions fill:#f57c00,color:#ffffff
    style Tasks fill:#2e7d32,color:#ffffff
    style Observations fill:#2e7d32,color:#ffffff
```

---

### **1.4 Plot Matching Service Algorithm**
**Source**: `docs/THOMAS_AGENT_ROADMAP.md`
**Description**: Detailed algorithm flow for intelligent plot/crop area matching

```mermaid
flowchart TD
    Start([Input: "serre 1", "planche 3 du tunnel"]) --> Extract[Extraction Mentions<br/>Regex patterns français]

    Extract --> Patterns{Types de<br/>patterns?}

    Patterns -->|Type 1| SerrePattern["serre|tunnel N"<br/>+ direction]
    Patterns -->|Type 2| PlanchePattern["planche N du/de la X"]
    Patterns -->|Type 3| CustomPattern[Patterns personnalisés<br/>basés aliases]

    SerrePattern --> FuzzyMatch1[Fuzzy Matching<br/>Levenshtein distance]
    PlanchePattern --> HierarchyMatch[Matching hiérarchique<br/>plot → surface_unit]
    CustomPattern --> ExactMatch[Exact matching<br/>sur aliases]

    FuzzyMatch1 --> Scoring1[Scoring confiance<br/>0.0 → 1.0]
    HierarchyMatch --> Scoring2[Scoring confiance<br/>+ hierarchy bonus]
    ExactMatch --> Scoring3[Scoring confiance<br/>perfect match = 1.0]

    Scoring1 --> Consolidate[Consolidation résultats<br/>tri par confidence]
    Scoring2 --> Consolidate
    Scoring3 --> Consolidate

    Consolidate --> Filter{Confidence ><br/>threshold?}

    Filter -->|❌ < 0.6| NoMatch[Aucun match<br/>return suggestions]
    Filter -->|✅ ≥ 0.6| ValidMatches[Matches valides<br/>ordonnés par score]

    NoMatch --> End([Return PlotMatch[]])
    ValidMatches --> Return([Return PlotMatch[]<br/>avec confidence scores])

    style Start fill:#1976d2,color:#ffffff
    style End fill:#f57c00,color:#ffffff
    style Return fill:#2e7d32,color:#ffffff
    style NoMatch fill:#d32f2f,color:#ffffff
```

---

### **1.5 Matching Services Class Relationships**
**Source**: `docs/THOMAS_AGENT_ROADMAP.md`
**Description**: Class diagram showing relationships between all matching services

```mermaid
classDiagram
    class PlotMatchingService {
        +matchPlots(text, context): Promise~PlotMatch[]~
        -extractPlotMentions(text): PlotMention[]
        -fuzzyMatchPlots(mention, plots): PlotMatch[]
        -resolveHierarchy(matches): PlotMatch[]
    }

    class MaterialMatchingService {
        +matchMaterials(text, context): Promise~MaterialMatch[]~
        -extractMaterialMentions(text): string[]
        -exactMatch(mention, materials): MaterialMatch[]
        -llmKeywordMatch(mention, materials): Promise~MaterialMatch[]~
        -suggestMaterials(mention, materials): MaterialMatch[]
    }

    class ConversionMatchingService {
        +resolveConversions(quantities, context): Promise~ConvertedQuantity[]~
        -findUserConversion(unit, conversions): UserConversion
        -applyConversion(quantity, conversion): ConvertedQuantity
    }

    class PlotMatch {
        +plot: Plot
        +surface_units?: SurfaceUnit[]
        +confidence: number
        +match_type: string
    }

    class MaterialMatch {
        +material: Material
        +confidence: number
        +match_method: string
    }

    class ConvertedQuantity {
        +original: QuantityMention
        +converted: {value: number, unit: string}
        +confidence: number
        +source: string
    }

    PlotMatchingService --> PlotMatch
    MaterialMatchingService --> MaterialMatch
    ConversionMatchingService --> ConvertedQuantity
```

---

### **1.6 Agent Tools Architecture**
**Source**: `docs/THOMAS_AGENT_ROADMAP.md`
**Description**: Complete architecture of all agent tools and their relationships to matching services

```mermaid
graph TB
    subgraph "Agent Tools Architecture"
        AgentTool[AgentTool Interface]
        ToolRegistry[ToolRegistry]

        subgraph "Agricultural Tools"
            ObsTool[ObservationTool]
            TaskDone[TaskDoneTool]
            TaskPlan[TaskPlannedTool]
            Harvest[HarvestTool]
        end

        subgraph "Management Tools"
            PlotTool[PlotTool]
            MaterialTool[MaterialTool]
            ConvTool[ConversionTool]
        end

        subgraph "Utility Tools"
            HelpTool[HelpTool]
            SearchTool[SearchTool]
            StatsTool[StatsTool]
        end

        subgraph "Matching Services"
            PlotMatch[PlotMatchingService]
            MatMatch[MaterialMatchingService]
            ConvMatch[ConversionMatchingService]
        end

        AgentTool --> ObsTool
        AgentTool --> TaskDone
        AgentTool --> TaskPlan
        AgentTool --> PlotTool
        AgentTool --> MaterialTool
        AgentTool --> ConvTool
        AgentTool --> HelpTool

        ToolRegistry --> AgentTool

        ObsTool --> PlotMatch
        TaskDone --> PlotMatch
        TaskDone --> MatMatch
        TaskDone --> ConvMatch
        TaskPlan --> PlotMatch

        PlotTool --> PlotMatch
        MaterialTool --> MatMatch
        ConvTool --> ConvMatch
    end
```

---

### **1.7 ObservationTool Execution Flow**
**Source**: `docs/THOMAS_AGENT_ROADMAP.md`
**Description**: Complete execution flow of the ObservationTool from agent call to database storage

```mermaid
flowchart TD
    Start([Agent appelle ObservationTool]) --> Validate{Validation<br/>Paramètres}

    Validate -->|❌ Invalid| ErrorReturn[Retour erreur<br/>+ suggestions]
    Validate -->|✅ Valid| PlotMatch[Matching Parcelle<br/>PlotMatchingService]

    PlotMatch --> FoundPlot{Parcelle<br/>trouvée?}

    FoundPlot -->|❌ Non| NoPlotError[Erreur: Parcelle introuvable<br/>+ liste suggestions]
    FoundPlot -->|✅ Oui| SelectBest[Sélection meilleur match<br/>highest confidence]

    SelectBest --> Categorize[Catégorisation automatique<br/>ravageurs/maladies/physiologie]

    Categorize --> CreateObs[Création Observation<br/>ObservationService]

    CreateObs --> Success{Création<br/>réussie?}

    Success -->|❌ Erreur| DbError[Erreur base de données<br/>+ recovery suggestions]
    Success -->|✅ OK| SuccessReturn[Retour succès<br/>+ observation_id + details]

    ErrorReturn --> End([Fin])
    NoPlotError --> End
    DbError --> End
    SuccessReturn --> End

    style Start fill:#1976d2,color:#ffffff
    style End fill:#2e7d32,color:#ffffff
    style ErrorReturn fill:#d32f2f,color:#ffffff
    style NoPlotError fill:#d32f2f,color:#ffffff
    style DbError fill:#d32f2f,color:#ffffff
    style SuccessReturn fill:#2e7d32,color:#ffffff
```

---

### **1.8 ObservationTool Class Structure**
**Source**: `docs/THOMAS_AGENT_ROADMAP.md`
**Description**: Class diagram of the ObservationTool implementation

```mermaid
classDiagram
    class AgentTool {
        <<interface>>
        +execute(input, context): Promise~ToolResult~
        +validate(input): ValidationResult
        +getSchema(): ToolSchema
    }

    class ObservationTool {
        +execute(input, context): Promise~ToolResult~
        +validate(input): ValidationResult
        +getSchema(): ToolSchema
        -categorizeObservation(description): string
        -createObservation(data, plot_id): Promise~number~
        -validatePlot(plot_id, context): Promise~boolean~
    }

    class ToolResult {
        +success: boolean
        +data: any
        +error?: string
        +suggestions?: string[]
    }

    class ValidationResult {
        +valid: boolean
        +errors: string[]
        +suggestions: string[]
    }

    AgentTool <|-- ObservationTool : implements
    ObservationTool --> ToolResult : returns
    ObservationTool --> ValidationResult : returns
```

---

## 🤖 AI Analysis & OpenAI Integration Diagrams

### **2.1 AI Analysis Complete Flow**
**Source**: `docs/archive/ARCHITECTURE_ANALYSE_IA.md`
**Description**: Complete end-to-end flow from user message to AI analysis and response

```mermaid
sequenceDiagram
    participant Phone as 📱 Téléphone User
    participant Client as 🖥️ App React Native
    participant Supabase as ☁️ Supabase Edge Function
    participant OpenAI as 🤖 OpenAI API
    participant DB as 💾 Database

    Phone->>Client: Utilisateur tape message
    Client->>Client: Affichage immédiat message
    Client->>Supabase: POST /functions/v1/analyze-message
    Note over Client,Supabase: Body: { message, session_id, user_context }

    Supabase->>DB: Récupération contexte user
    Note over Supabase,DB: Plots, matériaux, conversions

    Supabase->>OpenAI: Analyse IA avec contexte
    Note over Supabase,OpenAI: GPT-4 + prompts spécialisés

    OpenAI->>Supabase: Actions détectées + confiance
    Supabase->>DB: Sauvegarde résultats analyse

    Supabase->>Client: Réponse JSON structurée
    Note over Supabase,Client: { actions, confidence, analysis_id }

    Client->>Client: Affichage réponse IA
    Client->>Phone: Message IA visible
```

---

### **2.2 OpenAI Integration Architecture**
**Source**: `docs/archive/OPENAI_SUPABASE_ARCHITECTURE.md`
**Description**: How OpenAI API communicates with Supabase Edge Functions

```mermaid
sequenceDiagram
    participant App as 📱 App React Native
    participant Supabase as ☁️ Edge Function Supabase
    participant OpenAI as 🤖 OpenAI API
    participant DB as 💾 Database Supabase

    App->>Supabase: POST /functions/v1/analyze-message
    Note over App,Supabase: { message, session_id, user_context }

    Supabase->>DB: Récupération prompts + contexte user
    Note over Supabase,DB: chat_prompts, plots, materials, etc.

    Supabase->>OpenAI: POST https://api.openai.com/v1/chat/completions
    Note over Supabase,OpenAI: Headers: Authorization: Bearer OPENAI_API_KEY

    OpenAI-->>Supabase: Réponse JSON (actions agricoles analysées)

    Supabase->>DB: Sauvegarde analyse + actions
    Note over Supabase,DB: chat_message_analyses + chat_analyzed_actions

    Supabase-->>App: Résultat final
    Note over Supabase,App: { success: true, analysis_id, actions: [...] }
```

---

## 📝 Prompt Testing & System Diagrams

### **3.1 Prompt Management System Architecture**
**Source**: `docs/PROMPT_TESTING_COMPLETE.md`
**Description**: Complete architecture of the advanced prompt management system

```mermaid
graph TB
    subgraph "📝 Prompt Management System"
        subgraph "🔧 Core Services"
            Engine[PromptTemplateEngine<br/>✅ Variables + Conditions + Helpers]
            Testing[PromptTestingService<br/>✅ Tests automatisés + A/B]
            Manager[AdvancedPromptManager<br/>✅ Cache + Versioning + Auto-optim]
            Config[PromptConfigurationService<br/>✅ Interface + Export/Import]
        end

        subgraph "📚 Templates"
            SystemPrompt[thomas_agent_system v2.0<br/>✅ Instructions complètes]
            ToolSelection[tool_selection v2.0<br/>✅ Sélection autonome]
            IntentClass[intent_classification v2.0<br/>✅ Classification précise]
            ResponseSynth[response_synthesis v1.0<br/>✅ Réponses naturelles]
        end

        subgraph "📚 Templates"
            SystemPrompt[thomas_agent_system v2.0<br/>✅ Instructions complètes]
            ToolSelection[tool_selection v2.0<br/>✅ Sélection autonome]
            IntentClass[intent_classification v2.0<br/>✅ Classification précise]
            ResponseSynth[response_synthesis v1.0<br/>✅ Réponses naturelles]
        end

        subgraph "🗄️ Storage"
            ChatPrompts[(chat_prompts<br/>✅ Versioning + Metadata)]
            Migration[(021_insert_default_prompts.sql<br/>✅ Déploiement auto)]
        end
    end

    subgraph "🤖 Agent Integration"
        ThomasAgent[ThomasAgentService]
        Context[AgentContextService]
        Tools[Agent Tools]
    end

    Engine --> Manager
    Testing --> Manager
    Config --> Manager
    Manager --> SystemPrompt
    Manager --> ToolSelection
    Manager --> IntentClass
    Manager --> ResponseSynth

    SystemPrompt --> ChatPrompts
    ToolSelection --> ChatPrompts
    IntentClass --> ChatPrompts
    ResponseSynth --> ChatPrompts

    ChatPrompts -.-> Migration

    ThomasAgent -.-> Manager
    Context -.-> Manager
    Tools -.-> Manager
```

---

### **3.2 Prompt Testing Workflow**
**Source**: `docs/PROMPT_TESTING_COMPLETE.md`
**Description**: Complete workflow for prompt testing and optimization

```mermaid
graph TB
    subgraph "🔬 Test Suite Execution"
        subgraph "📋 Test Cases"
            Case1["Test Case 1<br/>Observation ravageurs"]
            Case2["Test Case 2<br/>Tâche récolte"]
            Case3["Test Case 3<br/>Planification traitement"]
            Case4["Test Case 4<br/>Question aide"]
        end

        subgraph "🎯 Test Scenarios"
            Scenario1["Scenario FR-01<br/>Agriculture française"]
            Scenario2["Scenario FR-02<br/>Multi-parcelles"]
            Scenario3["Scenario FR-03<br/>Conversions unités"]
            Scenario4["Scenario FR-04<br/>Context complexe"]
        end
    end

    subgraph "⚙️ Testing Engine"
        Template[PromptTemplateEngine<br/>✅ Rendering dynamique]
        Runner[TestRunner<br/>✅ Execution parallèle]
        Validator[ResponseValidator<br/>✅ Validation structure]
        Scorer[PerformanceScorer<br/>✅ Métriques multi-critères]
    end

    subgraph "📊 Results & Analytics"
        subgraph "📈 Performance Metrics"
            Success[Success Rate<br/>✅ 50% MVP target]
            Quality[Quality Score<br/>✅ 0.0-1.0 scale]
            Speed[Response Speed<br/>✅ <2s target]
            Tokens[Token Usage<br/>✅ Cost tracking]
        end

        subgraph "🔄 A/B Testing"
            VersionA[Version A<br/>Current prompt]
            VersionB[Version B<br/>Optimized prompt]
            Comparison[A/B Comparison<br/>✅ Statistical analysis]
        end
    end

    Case1 --> Template
    Case2 --> Template
    Case3 --> Template
    Case4 --> Template

    Scenario1 --> Runner
    Scenario2 --> Runner
    Scenario3 --> Runner
    Scenario4 --> Runner

    Template --> Runner
    Runner --> Validator
    Validator --> Scorer

    Scorer --> Success
    Scorer --> Quality
    Scorer --> Speed
    Scorer --> Tokens

    Success --> Comparison
    Quality --> Comparison
    VersionA --> Comparison
    VersionB --> Comparison

    style Case1 fill:#1976d2,color:#ffffff
    style Case2 fill:#1976d2,color:#ffffff
    style Case3 fill:#1976d2,color:#ffffff
    style Case4 fill:#1976d2,color:#ffffff
    style Scenario1 fill:#f57c00,color:#ffffff
    style Scenario2 fill:#f57c00,color:#ffffff
    style Scenario3 fill:#f57c00,color:#ffffff
    style Scenario4 fill:#f57c00,color:#ffffff
```

---

### **3.3 Phase 5 Prompt System Architecture**
**Source**: `docs/archive/PHASE5_PROMPT_SYSTEM_COMPLETE.md`
**Description**: Architecture of the Phase 5 advanced prompt system

```mermaid
graph TB
    subgraph "📝 Phase 5: Advanced Prompt Management System"
        subgraph "🔧 Core Engine"
            TemplateEngine[PromptTemplateEngine<br/>✅ Variables + Conditions + Helpers]
            TestService[PromptTestingService<br/>✅ Automated Testing + A/B]
            AdvManager[AdvancedPromptManager<br/>✅ Cache + Versioning + Auto-Optimization]
            ConfigService[PromptConfigurationService<br/>✅ Interface + Export/Import]
        end

        subgraph "📚 Prompt Templates v2.0"
            SystemPrompt[thomas_agent_system v2.0<br/>✅ Complete Instructions]
            ToolSelect[tool_selection v2.0<br/>✅ Autonomous Selection]
            IntentClass[intent_classification v2.0<br/>✅ Precise Classification]
            RespSynth[response_synthesis v1.0<br/>✅ Natural Responses]
        end

        subgraph "🗄️ Database Storage"
            ChatPrompts[(chat_prompts<br/>✅ Versioning + Metadata)]
            Migration[(021_insert_default_prompts.sql<br/>✅ Auto Deployment)]
        end
    end

    subgraph "🤖 Agent Integration"
        ThomasAgent[ThomasAgentService]
        AgentContext[AgentContextService]
        AgentTools[Agent Tools]
    end

    TemplateEngine --> AdvManager
    TestService --> AdvManager
    ConfigService --> AdvManager

    AdvManager --> SystemPrompt
    AdvManager --> ToolSelect
    AdvManager --> IntentClass
    AdvManager --> RespSynth

    SystemPrompt --> ChatPrompts
    ToolSelect --> ChatPrompts
    IntentClass --> ChatPrompts
    RespSynth --> ChatPrompts

    ChatPrompts -.-> Migration

    ThomasAgent -.-> AdvManager
    AgentContext -.-> AdvManager
    AgentTools -.-> AdvManager
```

---

### **3.4 Phase 6 Pipeline Complete Architecture**
**Source**: `docs/PHASE6_PIPELINE_COMPLETE.md`
**Description**: Complete Phase 6 pipeline architecture

```mermaid
graph TB
    subgraph "🚀 Phase 6: Complete Agent Pipeline"
        subgraph "📥 Input Processing"
            MessageInput[Message Input<br/>✅ Natural Language]
            ContextBuilder[Context Builder<br/>✅ Farm + User Context]
            IntentClassifier[Intent Classifier<br/>✅ Multi-Intent Detection]
        end

        subgraph "🧠 AI Analysis Engine"
            PromptManager[Prompt Manager<br/>✅ Dynamic Prompt Selection]
            OpenAIIntegration[OpenAI Integration<br/>✅ GPT-4 + Streaming]
            ResponseParser[Response Parser<br/>✅ Structured Action Extraction]
        end

        subgraph "🎯 Tool Execution Pipeline"
            ToolSelector[Tool Selector<br/>✅ Autonomous Tool Choice]
            ParameterMapper[Parameter Mapper<br/>✅ Context-Aware Mapping]
            ToolExecutor[Tool Executor<br/>✅ Parallel/Serial Execution]
        end

        subgraph "📊 Validation & Feedback"
            ResultValidator[Result Validator<br/>✅ Success/Error Detection]
            ConfidenceScorer[Confidence Scorer<br/>✅ Quality Metrics]
            FeedbackCollector[Feedback Collector<br/>✅ User Corrections]
        end

        subgraph "💾 Data Persistence"
            ActionStaging[Action Staging<br/>✅ chat_analyzed_actions]
            EntityResolver[Entity Resolver<br/>✅ Plot/Material Matching]
            DatabaseWriter[Database Writer<br/>✅ ACID Transactions]
        end

        subgraph "🔄 Execution Logging"
            ExecutionLogger[Execution Logger<br/>✅ chat_agent_executions]
            PerformanceMonitor[Performance Monitor<br/>✅ Response Times]
            ErrorTracker[Error Tracker<br/>✅ Failure Analysis]
        end
    end

    MessageInput --> ContextBuilder
    ContextBuilder --> IntentClassifier

    IntentClassifier --> PromptManager
    PromptManager --> OpenAIIntegration
    OpenAIIntegration --> ResponseParser

    ResponseParser --> ToolSelector
    ToolSelector --> ParameterMapper
    ParameterMapper --> ToolExecutor

    ToolExecutor --> ResultValidator
    ResultValidator --> ConfidenceScorer
    ConfidenceScorer --> FeedbackCollector

    FeedbackCollector --> ActionStaging
    ActionStaging --> EntityResolver
    EntityResolver --> DatabaseWriter

    ToolExecutor --> ExecutionLogger
    ResultValidator --> PerformanceMonitor
    ResultValidator --> ErrorTracker

    DatabaseWriter -.-> FeedbackCollector
    ExecutionLogger -.-> PerformanceMonitor
```

---

### **3.5 Phase 6 Pipeline Architecture**
**Source**: `docs/PHASE6_PIPELINE_COMPLETE.md`
**Description**: Complete Phase 6 pipeline architecture with all components

```mermaid
graph TB
    subgraph "🚀 Phase 6: Complete Agent Pipeline"
        subgraph "📥 Input Processing"
            MessageInput[Message Input<br/>✅ Natural Language]
            ContextBuilder[Context Builder<br/>✅ Farm + User Context]
            IntentClassifier[Intent Classifier<br/>✅ Multi-Intent Detection]
        end

        subgraph "🧠 AI Analysis Engine"
            PromptManager[Prompt Manager<br/>✅ Dynamic Prompt Selection]
            OpenAIIntegration[OpenAI Integration<br/>✅ GPT-4 + Streaming]
            ResponseParser[Response Parser<br/>✅ Structured Action Extraction]
        end

        subgraph "🎯 Tool Execution Pipeline"
            ToolSelector[Tool Selector<br/>✅ Autonomous Tool Choice]
            ParameterMapper[Parameter Mapper<br/>✅ Context-Aware Mapping]
            ToolExecutor[Tool Executor<br/>✅ Parallel/Serial Execution]
        end

        subgraph "📊 Validation & Feedback"
            ResultValidator[Result Validator<br/>✅ Success/Error Detection]
            ConfidenceScorer[Confidence Scorer<br/>✅ Quality Metrics]
            FeedbackCollector[Feedback Collector<br/>✅ User Corrections]
        end

        subgraph "💾 Data Persistence"
            ActionStaging[Action Staging<br/>✅ chat_analyzed_actions]
            EntityResolver[Entity Resolver<br/>✅ Plot/Material Matching]
            DatabaseWriter[Database Writer<br/>✅ ACID Transactions]
        end

        subgraph "🔄 Execution Logging"
            ExecutionLogger[Execution Logger<br/>✅ chat_agent_executions]
            PerformanceMonitor[Performance Monitor<br/>✅ Response Times]
            ErrorTracker[Error Tracker<br/>✅ Failure Analysis]
        end
    end

    MessageInput --> ContextBuilder
    ContextBuilder --> IntentClassifier

    IntentClassifier --> PromptManager
    PromptManager --> OpenAIIntegration
    OpenAIIntegration --> ResponseParser

    ResponseParser --> ToolSelector
    ToolSelector --> ParameterMapper
    ParameterMapper --> ToolExecutor

    ToolExecutor --> ResultValidator
    ResultValidator --> ConfidenceScorer
    ConfidenceScorer --> FeedbackCollector

    FeedbackCollector --> ActionStaging
    ActionStaging --> EntityResolver
    EntityResolver --> DatabaseWriter

    ToolExecutor --> ExecutionLogger
    ResultValidator --> PerformanceMonitor
    ResultValidator --> ErrorTracker

    DatabaseWriter -.-> FeedbackCollector
    ExecutionLogger -.-> PerformanceMonitor
```

---

### **3.6 AI Chat System Design Flow**
**Source**: `docs/archive/AI_CHAT_SYSTEM_DESIGN.md`
**Description**: Design flow for the AI chat system message processing pipeline

```mermaid
flowchart TD
    A[Message Utilisateur] --> B[Analyse IA]
    B --> C[Classification]
    C --> D[Décomposition]
    D --> E[Contextualisation]
    E --> F[Génération Cards]
    F --> G[Validation Utilisateur]
    G --> H[Sauvegarde]
```

---

## 📋 THOMAS AGENT V2 Complete Architecture

### **4.1 Complete Agent Architecture**
**Source**: `docs/THOMAS_AGENT_V2_COMPLETE.md`
**Description**: Complete architecture diagram for Thomas Agent v2.0

```mermaid
graph TB
    subgraph "📱 Frontend (React Native)"
        ChatUI[Chat Interface<br/>Real-time UI]
        ActionCards[Action Cards<br/>Editable Components]
        FarmContext[Farm Context<br/>Data Management]
    end

    subgraph "☁️ Backend (Supabase)"
        EdgeFunctions[Edge Functions<br/>analyze-message<br/>thomas-agent-v2]
        Database[(PostgreSQL<br/>Tables + RLS)]
        Realtime[Realtime<br/>WebSocket]
    end

    subgraph "🤖 AI Layer (OpenAI)"
        GPT4[GPT-4<br/>Advanced Analysis]
        Prompts[Dynamic Prompts<br/>Context-Aware]
        Embeddings[Embeddings<br/>Semantic Search]
    end

    subgraph "🛠️ Agent Tools"
        subgraph "🌾 Agricultural Tools"
            ObsTool[ObservationTool]
            TaskTool[TaskDoneTool]
            PlanTool[TaskPlannedTool]
            HarvestTool[HarvestTool]
        end

        subgraph "🏗️ Management Tools"
            PlotTool[PlotTool]
            MatTool[MaterialTool]
            ConvTool[ConversionTool]
        end

        subgraph "🔧 Utility Tools"
            HelpTool[HelpTool]
            SearchTool[SearchTool]
        end
    end

    subgraph "🎯 Matching Services"
        PlotMatch[Plot Matching<br/>French Regex + Fuzzy]
        MatMatch[Material Matching<br/>Exact + LLM]
        ConvMatch[Conversion Matching<br/>User-defined Units]
    end

    ChatUI --> EdgeFunctions
    ActionCards --> EdgeFunctions
    FarmContext --> Database

    EdgeFunctions --> GPT4
    GPT4 --> Prompts

    EdgeFunctions --> Database
    Database --> Realtime

    GPT4 --> ObsTool
    GPT4 --> TaskTool
    GPT4 --> PlanTool
    GPT4 --> HarvestTool
    GPT4 --> PlotTool
    GPT4 --> MatTool
    GPT4 --> ConvTool
    GPT4 --> HelpTool

    ObsTool --> PlotMatch
    TaskTool --> PlotMatch
    TaskTool --> MatMatch
    PlanTool --> PlotMatch
    HarvestTool --> PlotMatch

    PlotTool --> PlotMatch
    MatTool --> MatMatch
    ConvTool --> ConvMatch

    PlotMatch --> Database
    MatMatch --> Database
    ConvMatch --> Database

    style ChatUI fill:#1976d2,color:#ffffff
    style EdgeFunctions fill:#f57c00,color:#ffffff
    style GPT4 fill:#7b1fa2,color:#ffffff
    style Database fill:#2e7d32,color:#ffffff
```

---

## 📋 THOMAS AGENT V2 Complete Architecture

### **4.1 Complete Agent Architecture**
**Source**: `docs/THOMAS_AGENT_V2_COMPLETE.md`
**Description**: Complete architecture diagram for Thomas Agent v2.0

```mermaid
graph TB
    subgraph "📱 Frontend (React Native)"
        ChatUI[Chat Interface<br/>Real-time UI]
        ActionCards[Action Cards<br/>Editable Components]
        FarmContext[Farm Context<br/>Data Management]
    end

    subgraph "☁️ Backend (Supabase)"
        EdgeFunctions[Edge Functions<br/>analyze-message<br/>thomas-agent-v2]
        Database[(PostgreSQL<br/>Tables + RLS)]
        Realtime[Realtime<br/>WebSocket]
    end

    subgraph "🤖 AI Layer (OpenAI)"
        GPT4[GPT-4<br/>Advanced Analysis]
        Prompts[Dynamic Prompts<br/>Context-Aware]
        Embeddings[Embeddings<br/>Semantic Search]
    end

    subgraph "🛠️ Agent Tools"
        subgraph "🌾 Agricultural Tools"
            ObsTool[ObservationTool]
            TaskTool[TaskDoneTool]
            PlanTool[TaskPlannedTool]
            HarvestTool[HarvestTool]
        end

        subgraph "🏗️ Management Tools"
            PlotTool[PlotTool]
            MatTool[MaterialTool]
            ConvTool[ConversionTool]
        end

        subgraph "🔧 Utility Tools"
            HelpTool[HelpTool]
            SearchTool[SearchTool]
        end
    end

    subgraph "🎯 Matching Services"
        PlotMatch[Plot Matching<br/>French Regex + Fuzzy]
        MatMatch[Material Matching<br/>Exact + LLM]
        ConvMatch[Conversion Matching<br/>User-defined Units]
    end

    ChatUI --> EdgeFunctions
    ActionCards --> EdgeFunctions
    FarmContext --> Database

    EdgeFunctions --> GPT4
    GPT4 --> Prompts

    EdgeFunctions --> Database
    Database --> Realtime

    GPT4 --> ObsTool
    GPT4 --> TaskTool
    GPT4 --> PlanTool
    GPT4 --> HarvestTool
    GPT4 --> PlotTool
    GPT4 --> MatTool
    GPT4 --> ConvTool
    GPT4 --> HelpTool

    ObsTool --> PlotMatch
    TaskTool --> PlotMatch
    TaskTool --> MatMatch
    PlanTool --> PlotMatch
    HarvestTool --> PlotMatch

    PlotTool --> PlotMatch
    MatTool --> MatMatch
    ConvTool --> ConvMatch

    PlotMatch --> Database
    MatMatch --> Database
    ConvMatch --> Database

    style ChatUI fill:#1976d2,color:#ffffff
    style EdgeFunctions fill:#f57c00,color:#ffffff
    style GPT4 fill:#7b1fa2,color:#ffffff
    style Database fill:#2e7d32,color:#ffffff
```

---

## 📊 Summary

### **Total Diagrams**: 16 Mermaid diagrams across 9 files

### **Categories**:
- **🤖 AI Agent & Chat**: 8 diagrams (Thomas Agent architecture, matching services, execution flows)
- **🤖 AI Analysis & OpenAI**: 2 diagrams (analysis flows and integration)
- **📝 Prompt Testing & System**: 5 diagrams (prompt management, testing workflows, Phase 5/6 architectures)
- **📋 Complete Architecture**: 1 diagram (Thomas Agent v2.0 full stack)

### **File Sources**:
- `docs/AGENT_TOOLS_CREATED.md`: 1 diagram
- `docs/THOMAS_AGENT_ROADMAP.md`: 7 diagrams
- `docs/PROMPT_TESTING_COMPLETE.md`: 1 diagram
- `docs/PHASE6_PIPELINE_COMPLETE.md`: 1 diagram
- `docs/THOMAS_AGENT_V2_COMPLETE.md`: 1 diagram
- `docs/archive/ARCHITECTURE_ANALYSE_IA.md`: 1 diagram
- `docs/archive/OPENAI_SUPABASE_ARCHITECTURE.md`: 1 diagram
- `docs/archive/PHASE5_PROMPT_SYSTEM_COMPLETE.md`: 1 diagram
- `docs/archive/AI_CHAT_SYSTEM_DESIGN.md`: 1 diagram

This collection provides a comprehensive visual overview of the entire Thomas V2 agricultural AI agent system architecture, from frontend UI to backend database, covering all major components and data flows.
