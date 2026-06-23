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
    ['className="h-10 w-10 object-cover object-left -mr-2 grayscale"', 'className="h-10 w-auto object-contain -mr-5 grayscale"'],
    ['className="h-8 w-8 object-cover object-left -mr-1"', 'className="h-8 w-auto object-contain -mr-4"'],
    ['className="h-5 w-5 object-cover object-left -mr-1"', 'className="h-5 w-auto object-contain -mr-2"'],
    ['className="h-6 w-6 object-cover object-left -mr-1"', 'className="h-6 w-auto object-contain -mr-3"'],
    ['className="w-5 h-5 object-cover object-left -mr-1"', 'className="w-5 h-5 object-contain -mr-2"'],
    ['className="w-40 h-40 mb-6 object-cover object-left"', 'className="w-40 h-40 mb-6 object-contain -mr-16"'] // Auth page
  ];

  replacements.forEach(([findStr, replaceStr]) => {
    content = content.split(findStr).join(replaceStr);
  });

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed logo overlap in', f);
  }
});
