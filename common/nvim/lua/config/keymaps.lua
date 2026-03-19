-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

-- Alt/Option + arrows: word movement (like other editors)
-- GUI: <A-Left>/<A-Right>; terminal: enable "Use Option as Meta" for <M-b>/<M-f>
vim.keymap.set("i", "<A-Left>", "<C-o>b", { desc = "Word back", noremap = true })
vim.keymap.set("i", "<M-b>", "<C-o>b", { desc = "Word back (terminal)", noremap = true })
vim.keymap.set("i", "<A-Right>", "<C-o>e", { desc = "Word forward", noremap = true })
vim.keymap.set("i", "<M-f>", "<C-o>e", { desc = "Word forward (terminal)", noremap = true })
vim.keymap.set("n", "<A-Left>", "b", { desc = "Word back", noremap = true })
vim.keymap.set("n", "<M-b>", "b", { desc = "Word back (terminal)", noremap = true })
vim.keymap.set("n", "<A-Right>", "e", { desc = "Word forward", noremap = true })
vim.keymap.set("n", "<M-f>", "e", { desc = "Word forward (terminal)", noremap = true })

-- Alt+Backspace / Alt+Delete: delete word backward/forward (insert)
vim.keymap.set("i", "<A-BS>", "<C-w>", { desc = "Delete word backward", noremap = true })
vim.keymap.set("i", "<M-BS>", "<C-w>", { desc = "Delete word backward (terminal)", noremap = true })
vim.keymap.set("i", "<A-Del>", "<C-o>de", { desc = "Delete word forward", noremap = true })
vim.keymap.set("i", "<M-d>", "<C-o>de", { desc = "Delete word forward (terminal)", noremap = true })

-- Cmd+Left/Right: line start/end (macOS GUI sends <D-...>; terminal may not send Cmd)
vim.keymap.set("i", "<D-Left>", "<C-o>^", { desc = "Line start", noremap = true })
vim.keymap.set("n", "<D-Left>", "^", { desc = "Line start", noremap = true })
vim.keymap.set("i", "<D-Right>", "<C-o>$", { desc = "Line end", noremap = true })
vim.keymap.set("n", "<D-Right>", "$", { desc = "Line end", noremap = true })

vim.keymap.set("i", "<D-BS>", "<C-o>d0", { desc = "Delete to line start", noremap = true })

-- Cmd+B: show/toggle sidebar file explorer (LazyVim Snacks explorer)
vim.keymap.set("n", "<D-b>", "<cmd>Snacks explorer<cr>", { desc = "Sidebar", noremap = true })

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
