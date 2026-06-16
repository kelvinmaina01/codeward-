import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('../web/terms f service for codeward.md', 'utf-8');
const $ = cheerio.load(html);

let out = `import React from 'react';\nimport { Shield, Lock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';\n\nexport const termsContent = [\n`;

$('.clause-section').each((i, el) => {
  const $el = $(el);
  const title = $el.find('.clause-title').text().trim();
  const num = $el.find('.clause-number').text().trim() || `sch-${i}`;
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  let contentJsx = `<div className="space-y-4">\n`;
  
  $el.children().each((j, child) => {
    const $child = $(child);
    if ($child.hasClass('clause-header')) return; // Skip header
    
    if ($child.hasClass('sub-clause')) {
      const numStr = $child.find('.sub-clause-num').text().trim();
      const text = $child.find('div').last().text().trim();
      contentJsx += `  <div className="flex gap-4">\n    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">${numStr}</div>\n    <div className="leading-relaxed text-[14px]">${text}</div>\n  </div>\n`;
    } else if ($child.hasClass('sub-sub-clause')) {
      const numStr = $child.find('.sub-sub-label').text().trim();
      const text = $child.find('div').last().text().trim();
      contentJsx += `  <div className="flex gap-4 pl-12">\n    <div className="text-cw-txt2 shrink-0 pt-0.5 w-6">${numStr}</div>\n    <div className="leading-relaxed text-[14px]">${text}</div>\n  </div>\n`;
    } else if ($child.hasClass('notice-box')) {
      let type = 'info';
      let color = 'cw-blue';
      let Icon = 'CheckCircle2';
      if ($child.hasClass('warning')) { type = 'warning'; color = 'cw-amber'; Icon = 'AlertTriangle'; }
      if ($child.hasClass('danger')) { type = 'danger'; color = 'cw-red'; Icon = 'AlertTriangle'; }
      
      const titleText = $child.find('strong').text().trim() || '';
      // Remove the strong tag from the text to avoid duplication
      const fullHtml = $child.find('div').last().html() || '';
      const contentHtml = fullHtml.replace(/<strong>.*?<\/strong>/, '').trim();
      
      contentJsx += `  <div className="bg-${color}/10 border border-${color}/30 rounded-xl p-5 flex gap-4 mt-6 mb-2">\n    <${Icon} className="text-${color} shrink-0" size={24} />\n    <div>\n      <h4 className="font-semibold text-${color} mb-1 text-base">${titleText}</h4>\n      <p className="text-${color}/80 text-sm leading-relaxed">${contentHtml}</p>\n    </div>\n  </div>\n`;
    } else if ($child.hasClass('legal-table-wrapper')) {
      const caption = $child.find('.legal-table-caption').text().trim();
      contentJsx += `  <div className="mt-6 mb-4 border border-cw-bdr rounded-xl overflow-hidden">\n    <div className="bg-cw-bg2 px-4 py-3 border-b border-cw-bdr text-xs font-bold tracking-wider uppercase">${caption}</div>\n    <div className="overflow-x-auto">\n      <table className="w-full text-left text-sm">\n`;
      
      $child.find('thead tr').each((_, tr) => {
        contentJsx += `        <thead className="bg-cw-bg">\n          <tr>\n`;
        $(tr).find('th').each((_, th) => {
          contentJsx += `            <th className="px-4 py-3 font-semibold border-b border-cw-bdr">${$(th).text()}</th>\n`;
        });
        contentJsx += `          </tr>\n        </thead>\n`;
      });
      
      contentJsx += `        <tbody className="divide-y divide-cw-bdr">\n`;
      $child.find('tbody tr').each((_, tr) => {
        contentJsx += `          <tr className="hover:bg-cw-bg2/50 transition-colors">\n`;
        $(tr).find('td').each((_, td) => {
          const isNum = $(td).hasClass('num-cell');
          const val = $(td).html().replace(/<br>/g, '<br/>');
          contentJsx += `            <td className="px-4 py-3 align-top ${isNum ? 'font-bold text-cw-blue' : ''}">${val}</td>\n`;
        });
        contentJsx += `          </tr>\n`;
      });
      contentJsx += `        </tbody>\n      </table>\n    </div>\n  </div>\n`;
    } else if (child.tagName === 'p') {
      contentJsx += `  <p className="leading-relaxed text-[14px]">${$child.html().replace(/<br>/g, '<br/>')}</p>\n`;
    }
  });
  
  contentJsx += `</div>`;
  
  out += `  {\n    id: '${id}',\n    title: '${num}. ${title.replace(/'/g, "\\'")}',\n    content: (\n      ${contentJsx.split('\n').join('\n      ')}\n    )\n  },\n`;
});

out += `];\n`;

fs.writeFileSync('../web/src/app/components/TermsContent.tsx', out);
console.log('Done!');
