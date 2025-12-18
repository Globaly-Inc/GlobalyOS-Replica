import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Sparkles, Check } from "lucide-react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { BulkKpiContextStep } from "@/components/kpi/bulk/BulkKpiContextStep";
import { BulkKpiGenerateStep } from "@/components/kpi/bulk/BulkKpiGenerateStep";
import { BulkKpiReviewStep } from "@/components/kpi/bulk/BulkKpiReviewStep";
import { BulkKpiResultsStep } from "@/components/kpi/bulk/BulkKpiResultsStep";

export interface CascadeConfig {
  includeOrganization: boolean;
  includeDepartments: boolean;
  includeOffices: boolean;
  includeIndividuals: boolean;
}

export interface GeneratedKpi {
  tempId: string;
  scopeType: "organization" | "department" | "office" | "individual";
  scopeValue?: string;
  scopeId?: string;
  employeeId?: string;
  employeeName?: string;
  title: string;
  description: string;
  targetValue: number;
  unit: string;
  parentTempId?: string;
  // For editing
  selected: boolean;
  isEditing?: boolean;
}

export interface BulkKpiWizardState {
  step: number;
  quarter: number;
  year: number;
  cascadeConfig: CascadeConfig;
  targetDepartments: string[];
  targetOffices: string[];
  targetEmployees: string[];
  documentContent: string;
  documentName: string;
  generatedKpis: GeneratedKpi[];
  creationResults: {
    success: number;
    failed: number;
    errors: string[];
  };
}

const STEPS = [
  { id: 1, title: "Setup", description: "Configure scope & upload documents" },
  { id: 2, title: "Generate", description: "AI generates KPI suggestions" },
  { id: 3, title: "Review", description: "Edit and refine KPIs" },
  { id: 4, title: "Create", description: "Bulk create KPIs" },
];

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

const BulkKpiCreate = () => {
  const navigate = useNavigate();
  const { buildOrgPath } = useOrgNavigation();
  
  const [state, setState] = useState<BulkKpiWizardState>({
    step: 1,
    quarter: getCurrentQuarter(),
    year: getCurrentYear(),
    cascadeConfig: {
      includeOrganization: true,
      includeDepartments: true,
      includeOffices: false,
      includeIndividuals: true,
    },
    targetDepartments: [],
    targetOffices: [],
    targetEmployees: [],
    documentContent: "",
    documentName: "",
    generatedKpis: [],
    creationResults: { success: 0, failed: 0, errors: [] },
  });

  const updateState = (updates: Partial<BulkKpiWizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return Object.values(state.cascadeConfig).some(v => v);
      case 2:
        return state.generatedKpis.length > 0;
      case 3:
        return state.generatedKpis.some(k => k.selected);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (state.step < 4) {
      updateState({ step: state.step + 1 });
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      updateState({ step: state.step - 1 });
    }
  };

  const handleFinish = () => {
    navigate(buildOrgPath("/kpi-dashboard"));
  };

  const progressPercent = (state.step / STEPS.length) * 100;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 pt-4 pb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(buildOrgPath("/kpi-dashboard"))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Sparkles className="h-6 w-6 ai-gradient-icon" />
          <h1 className="text-3xl font-bold text-foreground">AI Bulk KPI Creation</h1>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, index) => (
                <div 
                  key={step.id}
                  className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                        ${state.step > step.id 
                          ? 'bg-primary text-primary-foreground' 
                          : state.step === step.id 
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                            : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {state.step > step.id ? <Check className="h-5 w-5" /> : step.id}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-sm font-medium ${state.step >= step.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 mt-[-24px] ${state.step > step.id ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progressPercent} className="h-1 mt-4" />
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="min-h-[500px]">
          {state.step === 1 && (
            <BulkKpiContextStep state={state} updateState={updateState} />
          )}
          {state.step === 2 && (
            <BulkKpiGenerateStep state={state} updateState={updateState} />
          )}
          {state.step === 3 && (
            <BulkKpiReviewStep state={state} updateState={updateState} />
          )}
          {state.step === 4 && (
            <BulkKpiResultsStep state={state} updateState={updateState} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={state.step === 1 ? () => navigate(buildOrgPath("/kpi-dashboard")) : handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {state.step === 1 ? "Cancel" : "Back"}
          </Button>

          {state.step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className={state.step === 2 ? "" : ""}
            >
              {state.step === 3 ? "Create KPIs" : "Next"}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish}>
              Go to Dashboard
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BulkKpiCreate;
