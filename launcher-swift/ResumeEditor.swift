import Cocoa
import WebKit
import UniformTypeIdentifiers

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {

    private var window: NSWindow!
    private var apiProcess: Process?
    private var webProcess: Process?

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        buildLoadingWindow()
        launchServers()
        // Wait for API first (fast), then web server (slower)
        waitForServer(url: "http://localhost:8001/health", attempts: 30) { [weak self] in
            self?.waitForServer(url: "http://localhost:3030", attempts: 60) {
                DispatchQueue.main.async { self?.openEditor() }
            }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        stopServers()
    }

    // Quit the app (and kill servers) when the window is closed
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    // Re-focus window if user clicks dock icon
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows: Bool) -> Bool {
        if !hasVisibleWindows { window?.makeKeyAndOrderFront(nil) }
        return true
    }

    // MARK: - Menu

    private func buildMenu() {
        let mainMenu = NSMenu()

        // App menu (shown as the app name)
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appItem.submenu = appMenu
        appMenu.addItem(NSMenuItem(title: "Hide Resume Editor",
                                   action: #selector(NSApplication.hide(_:)),
                                   keyEquivalent: "h"))
        appMenu.addItem(NSMenuItem(title: "Hide Others",
                                   action: #selector(NSApplication.hideOtherApplications(_:)),
                                   keyEquivalent: "H"))
        appMenu.addItem(NSMenuItem(title: "Show All",
                                   action: #selector(NSApplication.unhideAllApplications(_:)),
                                   keyEquivalent: ""))
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Quit Resume Editor",
                                   action: #selector(NSApplication.terminate(_:)),
                                   keyEquivalent: "q"))

        // Edit menu — needed for Cmd+C/V/X/A to work inside WKWebView
        let editItem = NSMenuItem()
        mainMenu.addItem(editItem)
        let editMenu = NSMenu(title: "Edit")
        editItem.submenu = editMenu
        editMenu.addItem(NSMenuItem(title: "Undo",  action: Selector(("undo:")),  keyEquivalent: "z"))
        editMenu.addItem(NSMenuItem(title: "Redo",  action: Selector(("redo:")),  keyEquivalent: "Z"))
        editMenu.addItem(.separator())
        editMenu.addItem(NSMenuItem(title: "Cut",   action: #selector(NSText.cut(_:)),   keyEquivalent: "x"))
        editMenu.addItem(NSMenuItem(title: "Copy",  action: #selector(NSText.copy(_:)),  keyEquivalent: "c"))
        editMenu.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"))
        editMenu.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))

        // Window menu
        let windowItem = NSMenuItem()
        mainMenu.addItem(windowItem)
        let windowMenu = NSMenu(title: "Window")
        windowItem.submenu = windowMenu
        windowMenu.addItem(NSMenuItem(title: "Close",    action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w"))
        windowMenu.addItem(NSMenuItem(title: "Minimize", action: #selector(NSWindow.miniaturize(_:)),  keyEquivalent: "m"))

        NSApp.mainMenu = mainMenu
    }

    // MARK: - Servers

    private func launchServers() {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let repo = "\(home)/Projects/resume-platform"

        apiProcess = shell(
            "source .venv/bin/activate && TYPST_PATH=/opt/homebrew/bin/typst RESUMES_BASE=../resumes python3 main.py",
            cwd: "\(repo)/api"
        )
        webProcess = shell(
            "NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev -- -p 3030",
            cwd: "\(repo)/web"
        )

        try? apiProcess?.run()
        try? webProcess?.run()
    }

    private func stopServers() {
        apiProcess?.terminate()
        webProcess?.terminate()
    }

    private func shell(_ command: String, cwd: String) -> Process {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/zsh")
        p.arguments = ["-l", "-c", command]
        p.currentDirectoryURL = URL(fileURLWithPath: cwd)
        p.standardOutput = FileHandle.nullDevice
        p.standardError  = FileHandle.nullDevice
        return p
    }

    // MARK: - Health polling

    private func waitForServer(url: String, attempts: Int, completion: @escaping () -> Void) {
        guard attempts > 0 else {
            DispatchQueue.main.async {
                self.showError("A server did not start in time.\n\nMake sure the Python venv is set up and npm is installed, then relaunch.")
            }
            return
        }
        guard let u = URL(string: url) else { return }

        var req = URLRequest(url: u)
        req.timeoutInterval = 2

        URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
            let ok = (resp as? HTTPURLResponse).map { $0.statusCode < 500 } ?? false
            if ok {
                completion()
            } else {
                DispatchQueue.global().asyncAfter(deadline: .now() + 1) {
                    self?.waitForServer(url: url, attempts: attempts - 1, completion: completion)
                }
            }
        }.resume()
    }

    // MARK: - Windows

    private func buildLoadingWindow() {
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 340, height: 160),
            styleMask:   [.titled, .closable, .fullSizeContentView],
            backing:     .buffered,
            defer:       false
        )
        window.titlebarAppearsTransparent = true
        window.title = "Resume Editor"
        window.isMovableByWindowBackground = true
        window.center()

        let root = NSView()
        root.translatesAutoresizingMaskIntoConstraints = false

        let spinner = NSProgressIndicator()
        spinner.style = .spinning
        spinner.controlSize = .regular
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.startAnimation(nil)

        let titleLabel = NSTextField(labelWithString: "Resume Editor")
        titleLabel.font = .boldSystemFont(ofSize: 15)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        let subtitleLabel = NSTextField(labelWithString: "Starting servers…")
        subtitleLabel.font = .systemFont(ofSize: 13)
        subtitleLabel.textColor = .secondaryLabelColor
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

        [spinner, titleLabel, subtitleLabel].forEach { root.addSubview($0) }
        window.contentView = root

        NSLayoutConstraint.activate([
            root.widthAnchor.constraint(equalToConstant: 340),
            root.heightAnchor.constraint(equalToConstant: 160),

            spinner.centerXAnchor.constraint(equalTo: root.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: root.centerYAnchor, constant: -18),

            titleLabel.centerXAnchor.constraint(equalTo: root.centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: spinner.bottomAnchor, constant: 14),

            subtitleLabel.centerXAnchor.constraint(equalTo: root.centerXAnchor),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
        ])

        window.makeKeyAndOrderFront(nil)
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView,
                 decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = action.request.url,
           url.host == "localhost",
           url.path.contains("/files/pdf"),
           action.navigationType == .linkActivated {
            // Intercept PDF download link — show Save dialog instead of navigating away
            decisionHandler(.cancel)
            downloadPDF(from: url)
            return
        }
        decisionHandler(.allow)
    }

    private func downloadPDF(from url: URL) {
        let panel = NSSavePanel()
        let resumeName = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "resume" })?.value ?? "resume"
        panel.nameFieldStringValue = "\(resumeName).pdf"
        panel.allowedContentTypes = [UTType.pdf]
        panel.begin { response in
            guard response == .OK, let dest = panel.url else { return }
            URLSession.shared.downloadTask(with: url) { tempURL, _, error in
                guard let tempURL = tempURL, error == nil else { return }
                try? FileManager.default.removeItem(at: dest)
                try? FileManager.default.moveItem(at: tempURL, to: dest)
            }.resume()
        }
    }

    private func openEditor() {
        let wv = WKWebView()
        wv.navigationDelegate = self
        wv.load(URLRequest(url: URL(string: "http://localhost:3030/editor")!))

        window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
        window.titlebarAppearsTransparent = false
        window.contentView = wv
        window.setContentSize(NSSize(width: 1400, height: 900))
        window.minSize = NSSize(width: 900, height: 600)
        window.center()
        window.title = "Resume Editor"
    }

    private func showError(_ message: String) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "Failed to Start"
        alert.informativeText = message
        alert.addButton(withTitle: "Quit")
        alert.runModal()
        NSApp.terminate(nil)
    }
}

// Entry point
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.activate(ignoringOtherApps: true)
app.run()
