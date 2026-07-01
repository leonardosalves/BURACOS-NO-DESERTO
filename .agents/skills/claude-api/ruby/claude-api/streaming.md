> 🔗 [[MEMORIA-LUMIERA]] · [[skills/claude-api|claude api]] · [[skills/claude-api/SKILL]] · [[skills/claude-api/REFERENCES]]

# Streaming — Ruby

## Streaming

```ruby
stream = client.messages.stream(
  model: :"claude-opus-4-8",
  max_tokens: 64000,
  messages: [{ role: "user", content: "Write a haiku" }]
)

stream.text.each { |text| print(text) }
```

---

