import os

path = r'd:\AntiGravity_Projects\Personal\travel-quote-v2\src\app\builder\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace the main return statement of the QuoteBuilder component.
# It is preceded by `const isImpersonating = profile?.role === 'super_admin';`

target = """  const isImpersonating = profile?.role === 'super_admin';

  return ("""

replacement = """  const isImpersonating = profile?.role === 'super_admin';

  if (quote.status === 'Confirmed' && !isReconfiguring) {
    return (
      <ConfirmedSummary 
        quote={quote} 
        onReconfigure={() => setIsReconfiguring(true)}
        onBack={() => router.push('/dashboard')}
      />
    );
  }

  return ("""

if target in content:
    new_content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_content)
    print("SUCCESS: Conditional return injected.")
else:
    print("ERROR: Target not found exactly. Trying line-by-line.")
    lines = content.splitlines()
    found = False
    for i in range(len(lines)):
        if "const isImpersonating = profile?.role === 'super_admin';" in lines[i]:
            # Look for the next return
            for j in range(i+1, min(i+10, len(lines))):
                if "return (" in lines[j]:
                    new_lines = lines[:j] + [
                        "  if (quote.status === 'Confirmed' && !isReconfiguring) {",
                        "    return (",
                        "      <ConfirmedSummary ",
                        "        quote={quote} ",
                        "        onReconfigure={() => setIsReconfiguring(true)}",
                        "        onBack={() => router.push('/dashboard')}",
                        "      />",
                        "    );",
                        "  }",
                        ""
                    ] + lines[j:]
                    with open(path, 'w', encoding='utf-8', newline='\n') as f:
                        f.write("\n".join(new_lines) + "\n")
                    found = True
                    print(f"SUCCESS: Injected at line {j+1}")
                    break
            if found: break
    if not found:
        print("CRITICAL ERROR: Could not find injection point.")
        import sys
        sys.exit(1)
