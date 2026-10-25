// Interactive C++ code blocks: edit, then compile & run on Compiler Explorer.
(function () {
  const API = "https://godbolt.org/api/compiler/";
  const COMPILERS = {
    "g++": { id: "g153", label: "g++ 15.3" },
    "clang++": { id: "clang2310", label: "clang++ 23.1" },
  };
  const DEFAULT_FLAGS = "-std=c++20 -Wall -Wextra -Wpedantic";

  const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  const lines = (arr) => (arr || []).map((l) => stripAnsi(l.text)).join("\n");

  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    for (const c of children) e.append(c);
    return e;
  }

  function base64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }

  function setup(box) {
    const codeEl = box.querySelector("pre code");
    if (!codeEl) return;
    const original = codeEl.textContent.replace(/\n+$/, "");
    const defaultFlags = box.dataset.flags || DEFAULT_FLAGS;

    // --- editor --------------------------------------------------------
    const editorHost = el("div", { className: "pg-editor" });
    const sourceBlock =
      box.querySelector(".code-copy-outer-scaffold") ||
      box.querySelector("div.sourceCode") ||
      codeEl.closest("pre");
    sourceBlock.replaceWith(editorHost);

    let getCode, setCode;
    if (window.CodeMirror) {
      const cm = CodeMirror(editorHost, {
        value: original,
        mode: "text/x-c++src",
        lineNumbers: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        viewportMargin: Infinity,
        extraKeys: {
          Tab: (cm) => cm.replaceSelection("    "),
          "Ctrl-Enter": () => run(),
          "Cmd-Enter": () => run(),
        },
      });
      getCode = () => cm.getValue();
      setCode = (v) => cm.setValue(v);
    } else {
      const ta = el("textarea", { className: "pg-textarea", value: original, spellcheck: false });
      ta.rows = original.split("\n").length + 1;
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
      });
      editorHost.append(ta);
      getCode = () => ta.value;
      setCode = (v) => (ta.value = v);
    }

    // --- toolbar -------------------------------------------------------
    const compilerSel = el("select", { className: "pg-compiler", title: "Compiler" });
    for (const [name, c] of Object.entries(COMPILERS)) {
      compilerSel.append(el("option", { value: name, textContent: c.label }));
    }
    const flagsIn = el("input", {
      className: "pg-flags", type: "text", value: defaultFlags,
      spellcheck: false, title: "Επιλογές του compiler",
    });
    const runBtn = el("button", { className: "pg-btn pg-run", textContent: "▶ Εκτέλεση", title: "Ctrl+Enter" });
    const resetBtn = el("button", { className: "pg-btn", textContent: "↺ Επαναφορά", title: "Επαναφορά του αρχικού κώδικα" });
    const ceLink = el("a", { className: "pg-btn", textContent: "Compiler Explorer ↗", target: "_blank", rel: "noopener" });
    const toolbar = el("div", { className: "pg-toolbar" }, [compilerSel, flagsIn, runBtn, resetBtn, ceLink]);

    // --- stdin ---------------------------------------------------------
    const stdinTa = el("textarea", { className: "pg-stdin", value: box.dataset.stdin || "", rows: 2, spellcheck: false });
    const stdinBox = el("details", { className: "pg-stdin-box", open: !!box.dataset.stdin }, [
      el("summary", { textContent: "Είσοδος προγράμματος (stdin)" }),
      stdinTa,
    ]);

    // --- terminal command --------------------------------------------
    const cmdCode = el("code");
    const copyBtn = el("button", { className: "pg-copy", textContent: "Αντιγραφή", title: "Αντιγραφή εντολής" });
    const cmdBox = el("div", { className: "pg-cmd" }, [
      el("span", { className: "pg-cmd-label", textContent: "Στο τερματικό:" }), cmdCode, copyBtn,
    ]);
    const command = () => {
      const flags = flagsIn.value.trim();
      return `${compilerSel.value} ${flags ? flags + " " : ""}-o main main.cpp && ./main`;
    };
    const updateCmd = () => (cmdCode.textContent = command());
    compilerSel.addEventListener("change", updateCmd);
    flagsIn.addEventListener("input", updateCmd);
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(command());
        copyBtn.textContent = "Αντιγράφηκε ✓";
      } catch {
        copyBtn.textContent = "Αποτυχία";
      }
      setTimeout(() => (copyBtn.textContent = "Αντιγραφή"), 1500);
    });
    updateCmd();

    const output = el("div", { className: "pg-output", hidden: true });

    box.append(toolbar, stdinBox, cmdBox, output);

    // --- actions -------------------------------------------------------
    resetBtn.addEventListener("click", () => {
      setCode(original);
      flagsIn.value = defaultFlags;
      updateCmd();
      output.hidden = true;
    });

    ceLink.addEventListener("click", () => {
      const id = COMPILERS[compilerSel.value].id;
      const opts = flagsIn.value;
      const state = {
        sessions: [{
          id: 1, language: "c++", source: getCode(),
          compilers: [{ id, options: opts }],
          executors: [{ compiler: { id, options: opts, libs: [] }, stdin: stdinTa.value }],
        }],
      };
      ceLink.href = "https://godbolt.org/clientstate/" + encodeURIComponent(base64Utf8(JSON.stringify(state)));
    });

    function section(title, text, cls) {
      return el("div", { className: "pg-section " + (cls || "") }, [
        el("div", { className: "pg-section-title", textContent: title }),
        el("pre", { textContent: text }),
      ]);
    }

    async function run() {
      updateCmd();
      runBtn.disabled = true;
      runBtn.textContent = "… Εκτελείται";
      output.hidden = false;
      output.replaceChildren(el("div", { className: "pg-status", textContent: "Μεταγλώττιση και εκτέλεση…" }));
      try {
        const res = await fetch(API + COMPILERS[compilerSel.value].id + "/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            source: getCode(),
            lang: "c++",
            options: {
              userArguments: flagsIn.value,
              executeParameters: { args: [], stdin: stdinTa.value },
              compilerOptions: { executorRequest: true },
              filters: { execute: true },
              tools: [],
              libraries: [],
            },
            allowStoreCodeDebug: false,
          }),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const r = await res.json();
        const parts = [];
        const build = r.buildResult || {};
        const diag = (lines(build.stdout) + "\n" + lines(build.stderr)).trim().replaceAll("<source>", "main.cpp");

        if (build.code !== 0 && !r.didExecute) {
          parts.push(section("Σφάλμα μεταγλώττισης", diag || "(χωρίς μήνυμα)", "pg-error"));
        } else {
          if (diag) parts.push(section("Μηνύματα compiler", diag, "pg-warn"));
          const out = lines(r.stdout);
          const err = lines(r.stderr);
          parts.push(section("Έξοδος", out || "(καμία έξοδος)", "pg-stdout"));
          if (err) parts.push(section("stderr", err, "pg-error"));
          let status = "Κωδικός εξόδου: " + r.code;
          if (r.timedOut) status = "Το πρόγραμμα ξεπέρασε το χρονικό όριο εκτέλεσης.";
          parts.push(el("div", { className: "pg-status" + (r.code === 0 ? "" : " pg-bad"), textContent: status }));
        }
        output.replaceChildren(...parts);
      } catch (e) {
        output.replaceChildren(section("Αποτυχία σύνδεσης με το Compiler Explorer", String(e), "pg-error"));
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = "▶ Εκτέλεση";
      }
    }
    runBtn.addEventListener("click", run);
  }

  const init = () => document.querySelectorAll(".cpp-playground").forEach(setup);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
