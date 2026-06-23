const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\Maxkryie Networks\\Desktop\\codeward project\\apps\\web\\src';

function walkDir(d) {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach((file) => {
    file = path.join(d, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir(dir);
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let newContent = content;
  newContent = newContent.replace(/Ã¢â‚¬â„¢/g, "’");
  newContent = newContent.replace(/Ã¢â€ â‚¬Ã¢â€ â‚¬/g, "──");
  newContent = newContent.replace(/Ã¢â€ Â /g, "←");
  newContent = newContent.replace(/Ã¢â‚¬Â¢/g, "•");
  newContent = newContent.replace(/Ã¢â‚¬â€ /g, "—");
  newContent = newContent.replace(/Ã¢â€ â€™/g, "→");
  newContent = newContent.replace(/Ã¢Å“Â¦/g, "✦");
  newContent = newContent.replace(/Ã¢â€ â€œ/g, "↓");
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf8');
    console.log('Fixed', f);
  }
});
