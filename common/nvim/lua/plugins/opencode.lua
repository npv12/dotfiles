return {
  "nickjvandyke/opencode.nvim",
  dependencies = {
    { "folke/snacks.nvim", opts = { input = {}, picker = {}, terminal = {} } },
  },
  config = function()
    -- Set environment variables globally for Neovim
    vim.env.CONTEXT7_API_KEY = vim.fn.system("pass tokens/context7"):gsub("\n", "")
    vim.env.SYNTHETIC_API_KEY = vim.fn.system("pass tokens/synthetic/simbian"):gsub("\n", "")
  end,
}
