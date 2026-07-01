> 🔗 [[MEMORIA-LUMIERA]] · [[skills/claude-api|claude api]] · [[skills/claude-api/SKILL]] · [[skills/claude-api/REFERENCES]]

# Files API — PHP

## Files API

```php
$file = $client->beta->files->upload(
    file: fopen('upload_me.txt', 'r'),
    betas: ['files-api-2025-04-14'],
);
// Reference $file->id as a file content block on ->beta->messages->create().
```
