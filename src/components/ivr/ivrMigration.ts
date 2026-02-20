import type { IvrTreeConfig, IvrNode, LegacyIvrConfig } from './ivrTypes';

let idCounter = 0;
const genId = (prefix: string) => `${prefix}_${++idCounter}`;

export function isTreeConfig(config: Record<string, unknown>): boolean {
  return Array.isArray((config as any)?.nodes);
}

export function migrateFlatIvrToTree(flat: LegacyIvrConfig): IvrTreeConfig {
  idCounter = 0;
  const nodes: IvrNode[] = [];

  // Root greeting
  const rootId = 'root';
  const rootNode: IvrNode = {
    id: rootId,
    type: 'greeting',
    label: 'Welcome',
    greeting_text: flat.greeting || 'Thank you for calling.',
    position: { x: 400, y: 50 },
    children: [],
  };
  nodes.push(rootNode);

  const menuOptions = flat.menu_options?.filter((o) => o.label.trim()) || [];

  if (menuOptions.length > 0) {
    // Create a menu node
    const menuId = genId('menu');
    const menuNode: IvrNode = {
      id: menuId,
      type: 'menu',
      label: 'Main Menu',
      position: { x: 400, y: 200 },
      menu_options: [],
      timeout: 10,
    };
    rootNode.children = [menuId];

    menuOptions.forEach((opt, i) => {
      let childNode: IvrNode;
      const xOffset = (i - (menuOptions.length - 1) / 2) * 220;

      switch (opt.action) {
        case 'voicemail': {
          const vmId = genId('vm');
          childNode = {
            id: vmId,
            type: 'voicemail',
            label: opt.label || 'Voicemail',
            voicemail_prompt: opt.message || 'Please leave a message after the beep.',
            position: { x: 400 + xOffset, y: 400 },
          };
          break;
        }
        case 'forward': {
          const fwdId = genId('fwd');
          childNode = {
            id: fwdId,
            type: 'forward',
            label: opt.label || 'Forward',
            forward_number: opt.message || '',
            position: { x: 400 + xOffset, y: 400 },
          };
          break;
        }
        case 'message':
        default: {
          const msgId = genId('msg');
          childNode = {
            id: msgId,
            type: 'message',
            label: opt.label || 'Message',
            greeting_text: opt.message || 'Thank you for calling.',
            position: { x: 400 + xOffset, y: 400 },
            children: [],
          };
          // Add hangup after message
          const hangupId = genId('hangup');
          const hangupNode: IvrNode = {
            id: hangupId,
            type: 'hangup',
            label: 'Hang Up',
            position: { x: 400 + xOffset, y: 550 },
          };
          childNode.children = [hangupId];
          nodes.push(hangupNode);
          break;
        }
      }

      menuNode.menu_options!.push({
        digit: opt.digit,
        label: opt.label,
        target_node_id: childNode.id,
      });
      nodes.push(childNode);
    });

    nodes.push(menuNode);
  } else if (flat.voicemail_enabled !== false) {
    // No menu, just voicemail
    const vmId = genId('vm');
    const vmNode: IvrNode = {
      id: vmId,
      type: 'voicemail',
      label: 'Voicemail',
      voicemail_prompt: 'Please leave a message after the beep.',
      position: { x: 400, y: 200 },
    };
    rootNode.children = [vmId];
    nodes.push(vmNode);
  }

  return {
    nodes,
    business_hours: flat.business_hours,
    voicemail_enabled: flat.voicemail_enabled,
  };
}

export function createDefaultTree(): IvrTreeConfig {
  return {
    nodes: [
      {
        id: 'root',
        type: 'greeting',
        label: 'Welcome',
        greeting_text: 'Thank you for calling. Please listen to the following options.',
        position: { x: 400, y: 50 },
        children: ['menu_1'],
      },
      {
        id: 'menu_1',
        type: 'menu',
        label: 'Main Menu',
        position: { x: 400, y: 220 },
        timeout: 10,
        menu_options: [
          { digit: '1', label: 'Sales', target_node_id: 'fwd_sales' },
          { digit: '2', label: 'Support', target_node_id: 'vm_support' },
        ],
      },
      {
        id: 'fwd_sales',
        type: 'forward',
        label: 'Sales',
        forward_number: '',
        position: { x: 220, y: 420 },
      },
      {
        id: 'vm_support',
        type: 'voicemail',
        label: 'Support',
        voicemail_prompt: 'Please leave a message for our support team.',
        position: { x: 580, y: 420 },
      },
    ],
    voicemail_enabled: true,
  };
}
