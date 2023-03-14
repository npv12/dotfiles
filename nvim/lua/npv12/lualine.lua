local status_ok, lualine = pcall(require, "lualine")
if not status_ok then
    return
end

local hide_in_width = function()
    return vim.fn.winwidth(0) > 60
end

local diagnostics = {
    "diagnostics",
    sources = {"nvim_diagnostic"},
    sections = {"error", "warn", "info", "hint"},
    symbols = {
        error = " ",
        warn = " ",
        hint = " ",
        info = " "
    },
    colored = true,
    update_in_insert = true,
    always_visible = true
}

local diff = {
    "diff",
    colored = true,
    symbols = {
        added = " ",
        modified = " ",
        removed = " "
    }, -- changes diff symbols
    cond = hide_in_width
}

local filetype = {
    "filetype",
    icons_enabled = false,
    colored = true,
    icon = nil
}

local branch = {
    "branch",
    icons_enabled = true,
    icon = "",
    colored = true
}

local spaces = function()
    return "spaces: " .. vim.api.nvim_buf_get_option(0, "shiftwidth")
end

local colors = {
    blue = '#89b4fa',
    cyan = '#94e2d5',
    black = '#11111b',
    white = '#cdd6f4',
    red = '#f38ba8',
    violet = '#cba6f7',
    grey = '#181825'
}

local bubbles = {
    normal = {
        a = {
            fg = colors.black,
            bg = colors.violet
        },
        b = {
            fg = colors.white,
            bg = colors.grey
        },
        c = {
            fg = colors.black,
            bg = colors.black
        }
    },

    insert = {
        a = {
            fg = colors.black,
            bg = colors.blue
        }
    },
    visual = {
        a = {
            fg = colors.black,
            bg = colors.cyan
        }
    },
    replace = {
        a = {
            fg = colors.black,
            bg = colors.red
        }
    },

    inactive = {
        a = {
            fg = colors.white,
            bg = colors.black
        },
        b = {
            fg = colors.white,
            bg = colors.black
        },
        c = {
            fg = colors.black,
            bg = colors.black
        }
    }
}

lualine.setup({
    options = {
        icons_enabled = true,
        theme = bubbles,
        component_separators = '|',
        section_separators = {
            left = '',
            right = ''
        },
        disabled_filetypes = {"alpha", "dashboard", "NvimTree", "Outline"}
    },
    sections = {
        lualine_a = {{
            'mode',
            separator = {
                left = ''
            },
            right_padding = 2
        }},
        lualine_b = {branch, diff, diagnostics},
        lualine_c = {'fileformat'},
        lualine_x = {},
        lualine_y = {spaces, "encoding", filetype, 'progress'},
        lualine_z = {{
            'location',
            separator = {
                right = ''
            },
            left_padding = 2
        }}
    },
    inactive_sections = {
        lualine_a = {'filename'},
        lualine_b = {},
        lualine_c = {},
        lualine_x = {},
        lualine_y = {},
        lualine_z = {'location'}
    },
    tabline = {},
    extensions = {}
})
