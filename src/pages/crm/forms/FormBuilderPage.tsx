import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ElementsPalette } from '@/components/forms/ElementsPalette';
import { FormCanvas } from '@/components/forms/FormCanvas';
import { SettingsPanel } from '@/components/forms/SettingsPanel';
import { FormBuilderToolbar } from '@/components/forms/FormBuilderToolbar';
import { ThemeDialog } from '@/components/forms/ThemeDialog';
import { PreviewDialog } from '@/components/forms/PreviewDialog';
import { useFormBuilder } from '@/services/useFormBuilder';
import { useForm, useCreateForm, useSaveFormDraft, usePublishForm, useFormDraftVersion } from '@/services/useForms';
import type { FormNode } from '@/types/forms';

export default function FormBuilderPage() {
  const { orgCode, formId } = useParams<{ orgCode: string; formId: string }>();
  const navigate = useNavigate();
  const isNew = !formId;

  const { data: existingForm } = useForm(formId);
  const { data: draftVersion } = useFormDraftVersion(formId);
  const createForm = useCreateForm();
  const saveDraft = useSaveFormDraft();
  const publishForm = usePublishForm();

  const {
    state,
    addNode,
    removeNode,
    updateNode,
    reorderNodes,
    selectNode,
    setForm,
    setLayout,
    setTheme,
    undo,
    redo,
    markClean,
  } = useFormBuilder();

  const [formName, setFormName] = useState('Untitled Form');
  const [showTheme, setShowTheme] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentFormId, setCurrentFormId] = useState<string | undefined>(formId);

  // Load existing form data
  useEffect(() => {
    if (existingForm) {
      setForm(existingForm);
      setFormName(existingForm.name);
      setTheme(existingForm.theme || {});
      setCurrentFormId(existingForm.id);
    }
  }, [existingForm]);

  useEffect(() => {
    if (draftVersion) {
      setLayout((draftVersion.layout_tree as unknown as FormNode[]) || []);
    }
  }, [draftVersion]);

  const selectedNode = state.layoutTree.find((n) => n.id === state.selectedNodeId) || null;

  async function handleSave() {
    let fId = currentFormId;

    if (!fId) {
      // Create form first
      const slug = formName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
      const form = await createForm.mutateAsync({ name: formName, slug });
      fId = form.id;
      setCurrentFormId(fId);
      navigate(`/org/${orgCode}/crm/forms/${fId}/builder`, { replace: true });
    }

    await saveDraft.mutateAsync({
      formId: fId,
      layoutTree: state.layoutTree,
      logicRules: state.logicRules,
      calculations: state.calculations,
      theme: state.theme,
      settings: state.settings,
      name: formName,
    });
    markClean();
  }

  async function handlePublish() {
    let fId = currentFormId;
    if (!fId) {
      await handleSave();
      fId = currentFormId;
    }
    if (!fId) return;

    await publishForm.mutateAsync({
      formId: fId,
      layoutTree: state.layoutTree,
      logicRules: state.logicRules,
      calculations: state.calculations,
    });
    markClean();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 md:-mx-8 -mt-4 md:-mt-6">
      {/* Builder body */}
      <div className="flex flex-1 overflow-hidden">
        <ElementsPalette onAddNode={addNode} />
        <FormCanvas
          nodes={state.layoutTree}
          selectedNodeId={state.selectedNodeId}
          onSelectNode={selectNode}
          onRemoveNode={removeNode}
          onReorder={reorderNodes}
          formName={formName}
          onFormNameChange={setFormName}
        />
        <SettingsPanel selectedNode={selectedNode} onUpdateNode={updateNode} />
      </div>

      {/* Bottom toolbar */}
      <FormBuilderToolbar
        onTheme={() => setShowTheme(true)}
        onPreview={() => setShowPreview(true)}
        onSave={handleSave}
        onPublish={handlePublish}
        onCancel={() => navigate(`/org/${orgCode}/crm/forms`)}
        onUndo={undo}
        onRedo={redo}
        canUndo={state.undoStack.length > 0}
        canRedo={state.redoStack.length > 0}
        isDirty={state.isDirty}
        isSaving={saveDraft.isPending}
        isPublishing={publishForm.isPending}
      />

      <ThemeDialog open={showTheme} onOpenChange={setShowTheme} theme={state.theme} onThemeChange={setTheme} />
      <PreviewDialog open={showPreview} onOpenChange={setShowPreview} nodes={state.layoutTree} theme={state.theme} formName={formName} />
    </div>
  );
}
