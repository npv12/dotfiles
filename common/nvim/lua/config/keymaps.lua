-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

-- Opencode keymaps
vim.keymap.set("n", "<leader>oa", function()
  require("opencode").ask()
end, { desc = "Opencode: Ask" })

vim.keymap.set("n", "<leader>os", function()
  require("opencode").select()
end, { desc = "Opencode: Select" })

vim.keymap.set("n", "<leader>ot", function()
  require("opencode").toggle()
end, { desc = "Opencode: Toggle" })

vim.keymap.set("n", "<leader>op", function()
  require("opencode").prompt()
end, { desc = "Opencode: Prompt" })

vim.keymap.set("n", "<leader>oc", function()
  require("opencode").command()
end, { desc = "Opencode: Command" })
