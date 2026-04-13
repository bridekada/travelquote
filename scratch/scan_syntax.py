import ast

path = r'd:\AntiGravity_Projects\Personal\travel-quote-v2\src\app\builder\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines)

# Check for unterminated single quotes
# We can do a simple scan for lines ending with a single quote or having odd number of quotes
issues = []
for i, line in enumerate(lines):
    # This is a bit naive but can catch simple literal newline splits
    if line.strip().endswith("'") and not line.strip().startswith("'") and "'" in line:
        count = line.count("'")
        if count % 2 != 0:
            issues.append(f"Line {i+1}: Potential unterminated single quote: {line.strip()}")
    if line.strip().endswith('"') and not line.strip().startswith('"') and '"' in line:
        count = line.count('"')
        if count % 2 != 0:
            issues.append(f"Line {i+1}: Potential unterminated double quote: {line.strip()}")

if issues:
    print("\n".join(issues))
else:
    print("No simple quote issues found.")

# Try to look for literal newlines in the middle of a string assignment
# e.g. .split('
# ')
for i in range(len(lines) - 1):
    if ".split('" in lines[i] and lines[i+1].strip().startswith("')"):
        print(f"Found literal newline split at line {i+1}")
