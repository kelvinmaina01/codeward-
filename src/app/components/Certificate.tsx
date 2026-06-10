export function Certificate() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="text-center bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5] border border-[#BBF7D0] rounded-xl p-6 mb-3">
        <div className="text-[60px] font-medium text-cw-green leading-none">91</div>
        <div className="text-[13px] text-cw-txt2 mt-1.5">Codeward health score · acme-corp/my-api</div>
        <div className="inline-block bg-[#DCFCE7] border border-[#BBF7D0] rounded-md px-3.5 py-1 text-[11px] text-cw-green my-2.5">
          ✓ Passed Codeward security &amp; quality review
        </div>
        <div className="text-[11px] text-cw-txt3">Last scan: 4 minutes ago · 0 critical · 0 high · 1 medium</div>
      </div>

      <div className="bg-cw-bg2 border border-cw-bdr rounded-[10px] px-3.5 py-3">
        <div className="text-[11px] font-medium text-cw-txt3 uppercase tracking-[.05em] mb-2">Share this certificate</div>
        <div className="bg-cw-bg3 rounded-md px-2.5 py-1.5 font-mono text-[11px] text-cw-txt2 mb-2">
          https://codeward.io/cert/acme-corp/my-api
        </div>
        <div className="flex gap-1.5">
          <button className="text-[11px] px-[11px] py-[5px] rounded-md border-none bg-cw-blue text-white cursor-pointer hover:opacity-90 transition-opacity">Copy link</button>
          <button className="text-[11px] px-[11px] py-[5px] rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt2 cursor-pointer hover:bg-cw-bg3 transition-colors">Embed badge</button>
          <button className="text-[11px] px-[11px] py-[5px] rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt2 cursor-pointer hover:bg-cw-bg3 transition-colors">Download PDF</button>
        </div>
        <div className="text-[11px] text-cw-txt3 mt-2">
          Show this on your landing page, investor decks, or README. Every visitor who clicks it and wants the same for their codebase is your next customer.
        </div>
      </div>
    </div>
  );
}
