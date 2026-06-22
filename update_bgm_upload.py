import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_bgm_upload = """                                      const formData = new FormData();
                                      formData.append('file', file);
                                      try {
                                        const res = await fetch(getProjectUrl(/api/upload-bgm?block=), {
                                          method: 'POST', body: formData
                                        });"""

new_bgm_upload = """                                      try {
                                        const res = await fetch(getProjectUrl(/api/upload-bgm?block=&filename=), {
                                          method: 'POST', 
                                          headers: { 'Content-Type': file.type || 'audio/mpeg' },
                                          body: file
                                        });"""

content = content.replace(old_bgm_upload, new_bgm_upload)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
