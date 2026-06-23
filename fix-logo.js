const fs = require('fs');
const path = require('path');
const dir = 'c:\\Users\\Maxkryie Networks\\Desktop\\codeward project\\apps\\web\\src';

function walk(d) {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach(file => {
    file = path.join(d, file);
    if (fs.statSync(file).isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
  });
  return results;
}

const files = walk(dir);
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  const replacements = [
    ['className="flex items-center gap-4 opacity-40"', 'className="flex items-center opacity-40"'],
    ['className="flex items-center gap-3"', 'className="flex items-center"'],
    ['className="h-8 w-auto object-contain grayscale"', 'className="h-10 w-10 object-cover object-left -mr-2 grayscale"'],
    ['className="h-8 w-auto object-contain"', 'className="h-8 w-8 object-cover object-left -mr-1"'],
    ['className="h-5 w-auto"', 'className="h-5 w-5 object-cover object-left -mr-1"'],
    ['className="h-6 w-auto object-contain"', 'className="h-6 w-6 object-cover object-left -mr-1"'],
    ['className="w-5 h-5 object-contain"', 'className="w-5 h-5 object-cover object-left -mr-1"'],
    ['className="w-40 h-40 mb-6 object-contain"', 'className="w-40 h-40 mb-6 object-cover object-left"']
  ];

  replacements.forEach(([findStr, replaceStr]) => {
    content = content.split(findStr).join(replaceStr);
  });

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed logo spacing in', f);
  }
});
