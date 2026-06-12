import re

html_path = r'c:\Users\Maxkryie Networks\Desktop\codeward project\guidelines\MASTER-PLAN\masterplan.html'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

def mark_step_done(html_content, step_id):
    # Find the start of the step
    step_start = html_content.find(f'<div class="step open" id="{step_id}">')
    if step_start == -1:
        step_start = html_content.find(f'<div class="step" id="{step_id}">')
        if step_start == -1:
            return html_content

    # Find the end of the step (next step or gate)
    step_end = html_content.find('<div class="step"', step_start + 10)
    if step_end == -1:
        step_end = html_content.find('<div class="gate"', step_start)
    
    if step_end == -1:
        step_end = len(html_content)

    step_content = html_content[step_start:step_end]
    
    # Replace `<div class="task"` with `<div class="task done"` inside this block
    # Only if it's not already done
    step_content = re.sub(r'<div class="task" onclick="toggleTask\(this\)">', r'<div class="task done" onclick="toggleTask(this)">', step_content)
    
    return html_content[:step_start] + step_content + html_content[step_end:]

# Mark 1.1, 1.2, 1.3, 1.4 as done
html = mark_step_done(html, 's1-1')
html = mark_step_done(html, 's1-2')
html = mark_step_done(html, 's1-3')
html = mark_step_done(html, 's1-4')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Marked 1.1 to 1.4 as done.")
