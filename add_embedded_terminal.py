import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

embedded_terminal = """
                {/* Embedded Terminal for Wizard Steps */}
                {logs.length > 0 && (creatorStep >= 3) && (
                  <div className="mt-8 bg-zinc-950 border border-zinc-900 rounded-2xl p-4 font-mono text-[10px] text-zinc-400 overflow-y-auto max-h-[300px] flex flex-col">
                    <div className="font-bold text-gold-500 mb-2 font-sans tracking-wider uppercase">Logs do Sistema</div>
                    <div className="flex-1 overflow-y-auto">
                      {logs.map((l, i) => (
                        <div key={i} className="mb-1 leading-relaxed">{l}</div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                )}
"""

# Insert right after the end of STEP 5 logic
# Step 5 ends with a div closing the main creatorStep container
find_str = """                        </button>
                      </div>
                    </div>
                  </div>
                )}"""
                
if find_str in content:
    content = content.replace(find_str, find_str + "\n" + embedded_terminal)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Embedded terminal added to Wizard!")
