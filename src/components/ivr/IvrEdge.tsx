import type { IvrNode } from './ivrTypes';

interface IvrEdgesProps {
  nodes: IvrNode[];
}

export function IvrEdges({ nodes }: IvrEdgesProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const edges: { from: IvrNode; to: IvrNode; label?: string }[] = [];

  for (const node of nodes) {
    // Children edges (greeting → child, message → child)
    if (node.children) {
      for (const childId of node.children) {
        const child = nodeMap.get(childId);
        if (child) edges.push({ from: node, to: child });
      }
    }
    // Menu option edges
    if (node.menu_options) {
      for (const opt of node.menu_options) {
        const target = nodeMap.get(opt.target_node_id);
        if (target) edges.push({ from: node, to: target, label: opt.digit });
      }
    }
  }

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
      <defs>
        <marker id="ivr-arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" className="fill-muted-foreground/50" />
        </marker>
      </defs>
      {edges.map((edge, i) => {
        const fromX = edge.from.position.x;
        const fromY = edge.from.position.y + 80; // bottom of node card
        const toX = edge.to.position.x;
        const toY = edge.to.position.y; // top of target node

        const midY = (fromY + toY) / 2;

        const path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;

        return (
          <g key={i}>
            <path
              d={path}
              fill="none"
              className="stroke-muted-foreground/40"
              strokeWidth="2"
              markerEnd="url(#ivr-arrow)"
            />
            {edge.label && (
              <text
                x={(fromX + toX) / 2 + (toX > fromX ? 8 : -8)}
                y={midY - 4}
                className="fill-muted-foreground text-[10px] font-bold"
                textAnchor="middle"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
