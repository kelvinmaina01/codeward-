import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('../../.agents/skills/privacy policy for codeward.md', 'utf-8');
const $ = cheerio.load(html);

let out = `import React from 'react';\nimport { Delete01Icon, Cancel01Icon, BotIcon, Analytics01Icon, Globe01Icon, Mail01Icon, ViewIcon, Edit01Icon, PauseIcon, PackageIcon, Notification01Icon, Tick01Icon, Alert01Icon, InformationIcon } from 'hugeicons-react';\n\nexport const privacyContent = [\n`;

function getIconForEmoji(emoji) {
  if (emoji.includes('🗑')) return '<Delete01Icon size={32} className="text-cw-blue shrink-0" />';
  if (emoji.includes('🚫')) return '<Cancel01Icon size={32} className="text-cw-red shrink-0" />';
  if (emoji.includes('🤖')) return '<BotIcon size={32} className="text-cw-purple shrink-0" />';
  if (emoji.includes('📊')) return '<Analytics01Icon size={32} className="text-cw-green shrink-0" />';
  if (emoji.includes('🌍')) return '<Globe01Icon size={32} className="text-cw-blue shrink-0" />';
  if (emoji.includes('✉')) return '<Mail01Icon size={32} className="text-cw-amber shrink-0" />';
  if (emoji.includes('👁')) return '<ViewIcon size={32} className="text-cw-blue shrink-0" />';
  if (emoji.includes('✏')) return '<Edit01Icon size={32} className="text-cw-blue shrink-0" />';
  if (emoji.includes('⏸')) return '<PauseIcon size={32} className="text-cw-blue shrink-0" />';
  if (emoji.includes('📦')) return '<PackageIcon size={32} className="text-cw-blue shrink-0" />';
  if (emoji.includes('📣')) return '<Notification01Icon size={32} className="text-cw-blue shrink-0" />';
  if (emoji.includes('✅')) return '<Tick01Icon size={32} className="text-cw-green shrink-0" />';
  if (emoji.includes('⚠️')) return '<Alert01Icon size={32} className="text-cw-amber shrink-0" />';
  return '<InformationIcon size={32} className="text-cw-blue shrink-0" />';
}

const $summary = $('.summary-card');
if ($summary.length) {
  const title = $summary.find('.summary-card-title').text().trim().replace(/[^a-zA-Z\s]/g, '').trim();
  let contentJsx = `<div className="space-y-6">\n`;
  contentJsx += `  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-cw-bg2 border border-cw-bdr rounded-xl p-6">\n`;
  $summary.find('.summary-item').each((_, item) => {
    const emoji = $(item).find('.summary-icon').text().trim();
    const strong = $(item).find('.summary-text strong').text().trim();
    const p = $(item).find('.summary-text').html().replace(new RegExp('<strong>.*?</strong>'), '').trim();
    const icon = getIconForEmoji(emoji);
    contentJsx += `    <div className="flex gap-4">\n      ${icon}\n      <div>\n        <h4 className="font-bold text-cw-txt text-[14px] mb-1">${strong}</h4>\n        <p className="text-cw-txt2 text-[13px] leading-relaxed">${p}</p>\n      </div>\n    </div>\n`;
  });
  contentJsx += `  </div>\n</div>`;
  out += `  {\n    id: 'quick-summary',\n    title: '${title}',\n    content: (\n      ${contentJsx.split('\\n').join('\\n      ')}\n    )\n  },\n`;
}

const $rights = $('.rights-grid');
let rightsContentJsx = '';
if ($rights.length) {
  rightsContentJsx += `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-4">\n`;
  $rights.find('.right-card').each((_, card) => {
    const rawTitle = $(card).find('.right-card-title').text().trim();
    const emojiMatch = rawTitle.match(/([^\\w\\s]+)\\s*(.*)/);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    const cleanTitle = emojiMatch ? emojiMatch[2] : rawTitle;
    const body = $(card).find('.right-card-body').text().trim();
    const icon = getIconForEmoji(emoji).replace('size={32}', 'size={24}');
    rightsContentJsx += `  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">\n    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">\n      ${icon}\n      ${cleanTitle}\n    </div>\n    <div className="text-cw-txt2 text-[13px] leading-relaxed">${body}</div>\n  </div>\n`;
  });
  rightsContentJsx += `</div>\n`;
}

$('.clause-section').each((i, el) => {
  const $el = $(el);
  const title = $el.find('.clause-title').text().trim();
  const num = $el.find('.clause-number').text().trim() || `sch-${i}`;
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  let contentJsx = `<div className="space-y-4">\n`;
  
  $el.children().each((j, child) => {
    const $child = $(child);
    if ($child.hasClass('clause-header')) return; 
    
    if ($child.hasClass('sub-clause')) {
      const numStr = $child.find('.sub-clause-num').text().trim();
      const text = $child.find('div').last().html().trim();
      contentJsx += `  <div className="flex gap-4">\n    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">${numStr}</div>\n    <div className="leading-relaxed text-[14px] text-cw-txt2">${text}</div>\n  </div>\n`;
    } else if ($child.hasClass('sub-sub-clause')) {
      const numStr = $child.find('.sub-sub-label').text().trim();
      const text = $child.find('div').last().html().trim();
      contentJsx += `  <div className="flex gap-4 pl-12">\n    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">${numStr}</div>\n    <div className="leading-relaxed text-[14px] text-cw-txt2">${text}</div>\n  </div>\n`;
    } else if ($child.hasClass('notice-box')) {
      let type = 'info';
      let color = 'cw-blue';
      let Icon = 'InformationIcon';
      if ($child.hasClass('warning')) { type = 'warning'; color = 'cw-amber'; Icon = 'Alert01Icon'; }
      if ($child.hasClass('danger')) { type = 'danger'; color = 'cw-red'; Icon = 'Alert01Icon'; }
      if ($child.hasClass('success')) { type = 'success'; color = 'cw-green'; Icon = 'Tick01Icon'; }
      
      const titleText = $child.find('strong').text().trim() || '';
      const fullHtml = $child.find('div').last().html() || '';
      const contentHtml = fullHtml.replace(new RegExp('<strong>.*?</strong>'), '').trim();
      
      contentJsx += `  <div className="bg-${color}/10 border border-${color}/30 rounded-xl p-5 flex gap-4 mt-6 mb-2">\n    <${Icon} size={28} className="text-${color} shrink-0 mt-0.5" />\n    <div>\n      <h4 className="font-semibold text-${color} mb-1 text-base">${titleText}</h4>\n      <p className="text-${color}/80 text-sm leading-relaxed">${contentHtml}</p>\n    </div>\n  </div>\n`;
    } else if ($child.hasClass('legal-table-wrapper')) {
      const caption = $child.find('.legal-table-caption').text().trim();
      contentJsx += `  <div className="mt-6 mb-4 border border-cw-bdr rounded-xl overflow-hidden">\n    <div className="bg-cw-bg2 px-4 py-3 border-b border-cw-bdr text-xs font-bold tracking-wider uppercase text-cw-txt">${caption}</div>\n    <div className="overflow-x-auto">\n      <table className="w-full text-left text-sm">\n`;
      
      $child.find('thead tr').each((_, tr) => {
        contentJsx += `        <thead className="bg-cw-bg">\n          <tr>\n`;
        $(tr).find('th').each((_, th) => {
          contentJsx += `            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">${$(th).text()}</th>\n`;
        });
        contentJsx += `          </tr>\n        </thead>\n`;
      });
      
      contentJsx += `        <tbody className="divide-y divide-cw-bdr">\n`;
      $child.find('tbody tr').each((_, tr) => {
        contentJsx += `          <tr className="hover:bg-cw-bg2/50 transition-colors">\n`;
        $(tr).find('td').each((_, td) => {
          const isNum = $(td).hasClass('num-cell');
          const isTagYes = $(td).find('.tag-yes').length > 0;
          const isTagNo = $(td).find('.tag-no').length > 0;
          
          let val = $(td).html().replace(/<br>/g, '<br/>');
          if (isTagYes) val = `<span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span>`;
          if (isTagNo) val = `<span className="px-2 py-1 bg-cw-red/10 text-cw-red font-bold text-[10px] rounded-full uppercase tracking-wider">NO</span>`;
          
          contentJsx += `            <td className="px-4 py-3 align-top text-cw-txt2 ${isNum ? 'font-bold text-cw-blue' : ''}">${val}</td>\n`;
        });
        contentJsx += `          </tr>\n`;
      });
      contentJsx += `        </tbody>\n      </table>\n    </div>\n  </div>\n`;
    } else if (child.tagName === 'p') {
      contentJsx += `  <p className="leading-relaxed text-[14px] text-cw-txt2">${$child.html().replace(/<br>/g, '<br/>')}</p>\n`;
      if ($child.text().includes('Rights Grid') || title.includes('Your Rights')) {
        contentJsx += rightsContentJsx; 
      }
    }
  });
  
  contentJsx += `</div>`;
  out += `  {\n    id: '${id}',\n    title: '${num}. ${title.replace(/'/g, "\\'")}',\n    content: (\n      ${contentJsx.split('\\n').join('\\n      ')}\n    )\n  },\n`;
});

out += `];\n`;
fs.writeFileSync('../web/src/app/components/PrivacyContent.tsx', out);
console.log('Done!');
