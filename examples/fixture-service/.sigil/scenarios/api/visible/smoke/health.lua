return {
  title    = "Fixture service responds to /health",
  priority = "P0",
  policy   = { capabilities = {"http"} },

  run = function()
    local res = sigil.get("/health")
    expect(res.status == 200)
    expect(res.json.ok == true)
    expect(res.json.service == "sigil-fixture")
  end,
}
