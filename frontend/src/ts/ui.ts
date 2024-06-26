import Config from "./config";
import * as Caret from "./test/caret";
import * as Notifications from "./elements/notifications";
import * as CustomText from "./test/custom-text";
import * as TestState from "./test/test-state";
import * as ConfigEvent from "./observables/config-event";
import { debounce, throttle } from "throttle-debounce";
import * as TestUI from "./test/test-ui";
import { get as getActivePage } from "./states/active-page";
import { canQuickRestart, isDevEnvironment } from "./utils/misc";
import { isCustomTextLong } from "./states/custom-text-name";

let isPreviewingFont = false;
export function previewFontFamily(font: string): void {
  document.documentElement.style.setProperty(
    "--font",
    '"' + font.replace(/_/g, " ") + '", "Roboto Mono", "Vazirmatn"'
  );
  isPreviewingFont = true;
}

export function clearFontPreview(): void {
  if (!isPreviewingFont) return;
  previewFontFamily(Config.fontFamily);
  isPreviewingFont = false;
}

function updateKeytips(): void {
  const modifierKey = window.navigator.userAgent.toLowerCase().includes("mac")
    ? "cmd"
    : "ctrl";

  const commandKey = Config.quickRestart === "esc" ? "tab" : "esc";
  $("footer .keyTips").html(`
    <key>${Config.quickRestart}</key> - restart test<br>
    <key>${commandKey}</key> or <key>${modifierKey}</key>+<key>shift</key>+<key>p</key> - command line`);
}

if (isDevEnvironment()) {
  window.onerror = function (error): void {
    Notifications.add(JSON.stringify(error), -1);
  };
  $("header #logo .top").text("localhost");
  $("head title").text($("head title").text() + " (localhost)");
  $("body").append(
    `<div class="devIndicator tl">local</div><div class="devIndicator br">local</div>`
  );
}

//stop space scrolling
window.addEventListener("keydown", function (e) {
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
  }
});

window.addEventListener("beforeunload", (event) => {
  // Cancel the event as stated by the standard.
  if (
    canQuickRestart(
      Config.mode,
      Config.words,
      Config.time,
      CustomText.getData(),
      isCustomTextLong() ?? false
    )
  ) {
    //ignore
  } else {
    if (TestState.isActive) {
      event.preventDefault();
      // Chrome requires returnValue to be set.
      event.returnValue = "";
    }
  }
});

const debouncedEvent = debounce(250, () => {
  void Caret.updatePosition();
  if (getActivePage() === "test" && !TestUI.resultVisible) {
    if (Config.tapeMode !== "off") {
      TestUI.scrollTape();
    } else {
      const word =
        document.querySelectorAll<HTMLElement>("#words .word")[
          TestUI.currentWordElementIndex - 1
        ];
      if (word) {
        const currentTop: number = Math.floor(word.offsetTop);
        TestUI.lineJump(currentTop);
      }
    }
  }
  setTimeout(() => {
    if ($("#wordsInput").is(":focus")) {
      Caret.show();
    }
  }, 250);
});

const throttledEvent = throttle(250, () => {
  Caret.hide();
});

$(window).on("resize", () => {
  throttledEvent();
  debouncedEvent();
});

ConfigEvent.subscribe((eventKey) => {
  if (eventKey === "quickRestart") updateKeytips();
});
