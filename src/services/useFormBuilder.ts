/**
 * Form Builder State Management (useReducer)
 */
import { useReducer, useCallback } from 'react';
import type {
  FormBuilderState,
  FormBuilderAction,
  FormNode,
  FormTheme,
  FormSettings,
  Form,
} from '@/types/forms';

const MAX_UNDO = 20;

const initialState: FormBuilderState = {
  form: null,
  layoutTree: [],
  logicRules: [],
  calculations: [],
  selectedNodeId: null,
  theme: {},
  settings: {},
  isDirty: false,
  undoStack: [],
  redoStack: [],
};

function pushUndo(state: FormBuilderState): FormBuilderState {
  const undoStack = [...state.undoStack, state.layoutTree].slice(-MAX_UNDO);
  return { ...state, undoStack, redoStack: [] };
}

function formBuilderReducer(
  state: FormBuilderState,
  action: FormBuilderAction
): FormBuilderState {
  switch (action.type) {
    case 'SET_FORM':
      return { ...state, form: action.payload };

    case 'SET_LAYOUT':
      return { ...state, layoutTree: action.payload, isDirty: true };

    case 'ADD_NODE': {
      const s = pushUndo(state);
      const tree = [...s.layoutTree];
      const idx = action.payload.index ?? tree.length;
      tree.splice(idx, 0, action.payload.node);
      return { ...s, layoutTree: tree, isDirty: true, selectedNodeId: action.payload.node.id };
    }

    case 'REMOVE_NODE': {
      const s = pushUndo(state);
      return {
        ...s,
        layoutTree: s.layoutTree.filter((n) => n.id !== action.payload),
        selectedNodeId: s.selectedNodeId === action.payload ? null : s.selectedNodeId,
        isDirty: true,
      };
    }

    case 'UPDATE_NODE': {
      const s = pushUndo(state);
      return {
        ...s,
        layoutTree: s.layoutTree.map((n) =>
          n.id === action.payload.id ? { ...n, ...action.payload.updates } : n
        ),
        isDirty: true,
      };
    }

    case 'REORDER_NODES': {
      const s = pushUndo(state);
      const { activeId, overId } = action.payload;
      const oldIdx = s.layoutTree.findIndex((n) => n.id === activeId);
      const newIdx = s.layoutTree.findIndex((n) => n.id === overId);
      if (oldIdx === -1 || newIdx === -1) return s;
      const tree = [...s.layoutTree];
      const [moved] = tree.splice(oldIdx, 1);
      tree.splice(newIdx, 0, moved);
      return { ...s, layoutTree: tree, isDirty: true };
    }

    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload };

    case 'SET_THEME':
      return { ...state, theme: action.payload, isDirty: true };

    case 'SET_SETTINGS':
      return { ...state, settings: action.payload, isDirty: true };

    case 'SET_LOGIC_RULES':
      return { ...state, logicRules: action.payload, isDirty: true };

    case 'SET_CALCULATIONS':
      return { ...state, calculations: action.payload, isDirty: true };

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const undoStack = [...state.undoStack];
      const prev = undoStack.pop()!;
      return {
        ...state,
        layoutTree: prev,
        undoStack,
        redoStack: [...state.redoStack, state.layoutTree].slice(-MAX_UNDO),
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const redoStack = [...state.redoStack];
      const next = redoStack.pop()!;
      return {
        ...state,
        layoutTree: next,
        redoStack,
        undoStack: [...state.undoStack, state.layoutTree].slice(-MAX_UNDO),
        isDirty: true,
      };
    }

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

export function useFormBuilder() {
  const [state, dispatch] = useReducer(formBuilderReducer, initialState);

  const setForm = useCallback((form: Form) => dispatch({ type: 'SET_FORM', payload: form }), []);
  const setLayout = useCallback((tree: FormNode[]) => dispatch({ type: 'SET_LAYOUT', payload: tree }), []);
  const addNode = useCallback((node: FormNode, index?: number) => dispatch({ type: 'ADD_NODE', payload: { node, index } }), []);
  const removeNode = useCallback((id: string) => dispatch({ type: 'REMOVE_NODE', payload: id }), []);
  const updateNode = useCallback((id: string, updates: Partial<FormNode>) => dispatch({ type: 'UPDATE_NODE', payload: { id, updates } }), []);
  const reorderNodes = useCallback((activeId: string, overId: string) => dispatch({ type: 'REORDER_NODES', payload: { activeId, overId } }), []);
  const selectNode = useCallback((id: string | null) => dispatch({ type: 'SELECT_NODE', payload: id }), []);
  const setTheme = useCallback((theme: FormTheme) => dispatch({ type: 'SET_THEME', payload: theme }), []);
  const setSettings = useCallback((settings: FormSettings) => dispatch({ type: 'SET_SETTINGS', payload: settings }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const markClean = useCallback(() => dispatch({ type: 'MARK_CLEAN' }), []);

  return {
    state,
    dispatch,
    setForm,
    setLayout,
    addNode,
    removeNode,
    updateNode,
    reorderNodes,
    selectNode,
    setTheme,
    setSettings,
    undo,
    redo,
    markClean,
  };
}
