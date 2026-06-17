import * as icons from 'hugeicons-react';
const keys = Object.keys(icons);
const prefixes = ['Delete', 'Cancel', 'Bot', 'Analytics', 'Globe', 'Mail', 'View', 'Edit', 'Pause', 'Package', 'Notification', 'Tick', 'Alert', 'Information'];
prefixes.forEach(p => {
  const matches = keys.filter(k => k.toLowerCase().includes(p.toLowerCase()));
  console.log(`${p}:`, matches.slice(0, 3).join(', '));
});
