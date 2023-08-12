---@type MappingsTable
local M = {}
local opts = {
  noremap = true,
  silent = true
}

M.general = {
  n = {
    [";"] = { ":", "enter command mode", opts = { nowait = true } },
    ["<C-Down"] = { ":resize +2<CR>", "resize window down", opts },
    ["<C-Up>"] = { ":resize -2<CR>", "resize window up", opts },
    ["<C-Right>"] = { ":vertical resize -2<CR>", "resize window right", opts },
    ["<C-Left>"] = { ":vertical resize +2<CR>", "resize window left", opts },
    ["<A-j>"] = {"<Esc>:m .+1<CR>==gi", "Move line up", opts},
    ["<A-k>"] = {"<Esc>:m .-2<CR>==gi", "Move line down", opts},
    ["<C-s>"] = { ":w<CR>", "save file", opts },
    ["<C-q>"] = { ":q<CR>", "quit file", opts },
    ["<C-x>"] = { ":x<CR>", "save and quit file", opts },
    ["<C-p>"] = { ":Telescope find_files<CR>", "find files", opts },
    ["<C-f>"] = { ":Telescope live_grep<CR>", "find in files", opts },
    ["<C-h>"] = { ":Telescope help_tags<CR>", "find help tags", opts },
    ["<C-b>"] = {":NvimTreeToggle<cr>", "Toggle the treesitter", opts},
    ["<A-r>"] = {"<cmd>lua require('spectre').open()<CR>", "Open spectre", opts},
    ["<S-r>"] = {"viw:lua require('spectre').open_file_search()<cr>", "Search using spectre", opts},
  },
  i = {
    ["<C-p>"] = { ":Telescope find_files<CR>", "find files", opts },
    ["<C-f>"] = { ":Telescope live_grep<CR>", "find in files", opts },
    ["<C-h>"] = { ":Telescope help_tags<CR>", "find help tags", opts },
  },
  v = {
    ["<C-p>"] = { ":Telescope find_files<CR>", "find files", opts },
    ["<C-f>"] = { ":Telescope live_grep<CR>", "find in files", opts },
    ["<C-h>"] = { ":Telescope help_tags<CR>", "find help tags", opts },
  }
}
return M
