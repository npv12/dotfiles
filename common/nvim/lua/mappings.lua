require "nvchad.mappings"

local map = vim.keymap.set

map("n", ";", ":", { desc = "CMD enter command mode" })
map("i", "jk", "<ESC>")

-- Custom ones
-- Normal mode mappings
map("n", ";", ":", { desc = "enter command mode", nowait = true })
map("n", "<C-Down>", ":resize +2<CR>", { desc = "resize window down" })
map("n", "<C-Up>", ":resize -2<CR>", { desc = "resize window up" })
map("n", "<C-Right>", ":vertical resize -2<CR>", { desc = "resize window right" })
map("n", "<C-Left>", ":vertical resize +2<CR>", { desc = "resize window left" })
map("n", "<A-j>", "<Esc>:m .+1<CR>==gi", { desc = "Move line up" })
map("n", "<A-k>", "<Esc>:m .-2<CR>==gi", { desc = "Move line down" })
map("n", "<C-s>", ":w<CR>", { desc = "save file" })
map("n", "<C-q>", ":q<CR>", { desc = "quit file" })
map("n", "<C-x>", ":x<CR>", { desc = "save and quit file" })
map("n", "<C-p>", ":Telescope find_files<CR>", { desc = "find files" })
map("n", "<C-f>", ":Telescope live_grep<CR>", { desc = "find in files" })
map("n", "<C-h>", ":Telescope help_tags<CR>", { desc = "find help tags" })
map("n", "<C-b>", ":NvimTreeToggle<CR>", { desc = "Toggle the treesitter" })
map("n", "<A-r>", "<cmd>lua require('spectre').open()<CR>", { desc = "Open spectre" })
map("n", "<S-r>", "viw:lua require('spectre').open_file_search()<CR>", { desc = "Search using spectre" })

-- Insert mode mappings
map("i", "<C-p>", ":Telescope find_files<CR>", { desc = "find files" })
map("i", "<C-f>", ":Telescope live_grep<CR>", { desc = "find in files" })
map("i", "<C-h>", ":Telescope help_tags<CR>", { desc = "find help tags" })

-- Visual mode mappings
map("v", "<C-p>", ":Telescope find_files<CR>", { desc = "find files" })
map("v", "<C-f>", ":Telescope live_grep<CR>", { desc = "find in files" })
map("v", "<C-h>", ":Telescope help_tags<CR>", { desc = "find help tags" })
