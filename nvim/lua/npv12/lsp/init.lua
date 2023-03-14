local status_ok, _ = pcall(require, "lspconfig")
if not status_ok then
    return
end

require "npv12.lsp.mason"
require("npv12.lsp.handlers").setup()
require "npv12.lsp.null-ls"
