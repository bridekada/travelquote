import os

path = r'd:\AntiGravity_Projects\Personal\travel-quote-v2\src\app\builder\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix literal the literal \n issue if it exists (caused by previous script error)
# Note: the view_file showed literal \n strings if it read it as a single line
# But if it's literally the string "\n", we fix it.
if '\\n' in content:
    content = content.replace('\\n', '\n')

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("File normalized.")
