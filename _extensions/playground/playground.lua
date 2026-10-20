-- Turns ```{.cpp .run} code blocks into editable, runnable playgrounds
-- in HTML output (compiled on Compiler Explorer, godbolt.org).
-- Other formats (PDF) get an ordinary code block.
--
-- Optional attributes:
--   file="examples/x.cpp"  load the code from a file (relative to the project root)
--   flags="-std=c++20 ..."  default compiler flags for this block
--   stdin="..."             default program input

local function read_file(path)
  local root = quarto.project.directory or "."
  local f = io.open(pandoc.path.join({ root, path }), "r")
  if not f then
    quarto.log.error("playground: cannot read " .. path)
    return nil
  end
  local text = f:read("a"):gsub("\n+$", "")
  f:close()
  return text
end

local deps_added = false

local function add_deps()
  if deps_added then return end
  deps_added = true
  quarto.doc.include_text("in-header", [[
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js"></script>
]])
  quarto.doc.add_html_dependency({
    name = "cpp-playground",
    version = "1.0.0",
    scripts = { "playground.js" },
    stylesheets = { "playground.css" },
  })
end

function CodeBlock(el)
  if not el.classes:includes("run") then return nil end

  if el.attributes.file then
    el.text = read_file(el.attributes.file) or el.text
    el.attributes.file = nil
  end
  el.classes = el.classes:filter(function(c) return c ~= "run" end)
  if not el.classes:includes("cpp") then el.classes:insert(1, "cpp") end

  if not quarto.doc.is_format("html") then
    el.attributes.flags = nil
    el.attributes.stdin = nil
    return el
  end

  add_deps()
  local attrs = {}
  if el.attributes.flags then attrs["data-flags"] = el.attributes.flags end
  if el.attributes.stdin then attrs["data-stdin"] = el.attributes.stdin end
  el.attributes.flags = nil
  el.attributes.stdin = nil
  return pandoc.Div({ el }, pandoc.Attr("", { "cpp-playground" }, attrs))
end
