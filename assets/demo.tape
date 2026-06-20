# demo.tape — record the ai-test-auditor demo GIF with VHS.
#
#   1. Install VHS:        brew install vhs   (or: go install github.com/charmbracelet/vhs@latest)
#   2. Build + link once:  npm run build && npm link
#   3. Record:             vhs assets/demo.tape
#   -> writes assets/demo.gif (the file the README embeds)

Output assets/demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1280
Set Height 860
Set Padding 24
Set Theme "Dracula"
Set TypingSpeed 60ms

# Intro
Type "# Your AI writes tests that test nothing. Here's the tool that catches them."
Sleep 1500ms
Enter

# The headline run
Type "ai-test-auditor examples/"
Sleep 800ms
Enter
Sleep 4s

# Fail the build in CI on weak-or-worse tests
Type "ai-test-auditor examples/ --fail-on weak; echo \"exit: $?\""
Sleep 800ms
Enter
Sleep 3s

# Machine-readable output
Type "ai-test-auditor examples/ --json | head -20"
Sleep 800ms
Enter
Sleep 3500ms
