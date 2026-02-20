import { useState, useCallback, useRef } from 'react';
import type { IvrNode, IvrTreeConfig, IvrNodeType, IvrMenuOption } from './ivrTypes';
import { isTreeConfig, migrateFlatIvrToTree, createDefaultTree } from './ivrMigration';

let globalIdCounter = Date.now();
const generateId = (prefix: string) => `${prefix}_${++globalIdCounter}`;

export function useIvrBuilder(initialConfig: Record<string, unknown> | null) {
  const [tree, setTree] = useState<IvrTreeConfig>(() => {
    if (!initialConfig || Object.keys(initialConfig).length === 0) {
      return createDefaultTree();
    }
    if (isTreeConfig(initialConfig)) {
      return initialConfig as unknown as IvrTreeConfig;
    }
    return migrateFlatIvrToTree(initialConfig as any);
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<IvrTreeConfig[]>([]);
  const lastSavedRef = useRef<string>(JSON.stringify(tree));

  const isDirty = JSON.stringify(tree) !== lastSavedRef.current;

  const pushUndo = useCallback((prev: IvrTreeConfig) => {
    setUndoStack((s) => [...s.slice(-19), prev]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setTree(prev);
      return stack.slice(0, -1);
    });
  }, []);

  const findNode = useCallback(
    (id: string) => tree.nodes.find((n) => n.id === id) ?? null,
    [tree.nodes]
  );

  const selectedNode = selectedNodeId ? findNode(selectedNodeId) : null;

  const updateNode = useCallback(
    (id: string, updates: Partial<IvrNode>) => {
      pushUndo(tree);
      setTree((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      }));
    },
    [tree, pushUndo]
  );

  const moveNode = useCallback(
    (id: string, position: { x: number; y: number }) => {
      // No undo for drag moves (too many)
      setTree((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, position } : n)),
      }));
    },
    []
  );

  const addNode = useCallback(
    (type: IvrNodeType, parentId?: string, digit?: string): string => {
      pushUndo(tree);
      const id = generateId(type);
      const parent = parentId ? findNode(parentId) : null;

      // Offset X for siblings to prevent overlap
      let siblingCount = 0;
      if (parent) {
        if (parent.type === 'menu') {
          siblingCount = parent.menu_options?.length || 0;
        } else {
          siblingCount = parent.children?.length || 0;
        }
      }
      const xSpread = 220;
      const baseX = parent
        ? parent.position.x + (siblingCount * xSpread) - ((siblingCount > 0 ? siblingCount - 1 : 0) * xSpread / 2)
        : 400;
      const baseY = parent ? parent.position.y + 180 : 50;

      const newNode: IvrNode = {
        id,
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        position: { x: baseX, y: baseY },
      };

      switch (type) {
        case 'greeting':
          newNode.greeting_text = '';
          newNode.children = [];
          break;
        case 'menu':
          newNode.menu_options = [];
          newNode.timeout = 10;
          break;
        case 'voicemail':
          newNode.voicemail_prompt = 'Please leave a message after the beep.';
          break;
        case 'forward':
          newNode.forward_number = '';
          break;
        case 'message':
          newNode.greeting_text = '';
          newNode.children = [];
          break;
        case 'hangup':
          break;
      }

      setTree((prev) => {
        const nodes = [...prev.nodes, newNode];

        // Link parent → child
        if (parentId) {
          return {
            ...prev,
            nodes: nodes.map((n) => {
              if (n.id !== parentId) return n;
              if (n.type === 'menu' && digit) {
                const opts = [...(n.menu_options || [])];
                opts.push({ digit, label: newNode.label, target_node_id: id });
                return { ...n, menu_options: opts };
              }
              return { ...n, children: [...(n.children || []), id] };
            }),
          };
        }

        return { ...prev, nodes };
      });

      setSelectedNodeId(id);
      return id;
    },
    [tree, findNode, pushUndo]
  );

  const removeNode = useCallback(
    (id: string) => {
      if (id === 'root') return; // Can't remove root
      pushUndo(tree);
      setTree((prev) => {
        // Collect all descendant IDs
        const toRemove = new Set<string>();
        const collect = (nodeId: string) => {
          toRemove.add(nodeId);
          const node = prev.nodes.find((n) => n.id === nodeId);
          if (!node) return;
          node.children?.forEach(collect);
          node.menu_options?.forEach((o) => collect(o.target_node_id));
        };
        collect(id);

        const nodes = prev.nodes
          .filter((n) => !toRemove.has(n.id))
          .map((n) => ({
            ...n,
            children: n.children?.filter((c) => !toRemove.has(c)),
            menu_options: n.menu_options?.filter((o) => !toRemove.has(o.target_node_id)),
          }));

        return { ...prev, nodes };
      });

      if (selectedNodeId && selectedNodeId === id) {
        setSelectedNodeId(null);
      }
    },
    [tree, selectedNodeId, pushUndo]
  );

  const markSaved = useCallback(() => {
    lastSavedRef.current = JSON.stringify(tree);
  }, [tree]);

  const toSavePayload = useCallback((): Record<string, unknown> => {
    return tree as unknown as Record<string, unknown>;
  }, [tree]);

  return {
    tree,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    isDirty,
    findNode,
    updateNode,
    moveNode,
    addNode,
    removeNode,
    undo,
    canUndo: undoStack.length > 0,
    markSaved,
    toSavePayload,
  };
}
