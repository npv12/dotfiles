local status_ok, barbecue = pcall(require, "barbecue")
if not status_ok then
    return
end

-- triggers CursorHold event faster
vim.opt.updatetime = 200

barbecue.setup({
    theme = "catppuccin"
})
