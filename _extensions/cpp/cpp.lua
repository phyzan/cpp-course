-- {{< cpp >}}: typeset "C++" with smaller, raised plus signs in PDF,
-- plain "C++" (kept on one line) everywhere else.
return {
  ["cpp"] = function(args, kwargs, meta)
    if quarto.doc.is_format("latex") then
      return pandoc.RawInline("latex",
        "\\mbox{C\\kern-.03em\\raisebox{.2ex}{\\scalebox{.85}{\\textbf{+\\kern-.05em+}}}}")
    elseif quarto.doc.is_format("html") then
      return pandoc.RawInline("html", '<span style="white-space: nowrap">C++</span>')
    end
    return pandoc.Str("C++")
  end
}
