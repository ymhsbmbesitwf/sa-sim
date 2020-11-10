"use strict";
function remove(a) {
    a.parentNode.removeChild(a);
}
function switch_theme() {
    var a = $("#dark");
    localStorage.dark = (a.disabled = !a.disabled) ? "" : "1";
}
function show_alert(a, b) {
    $("#alert").innerHTML +=
        "<p class=" +
        a +
        ">\n			<span class=badge onclick='remove(this.parentNode)'>×</span>\n			" +
        b +
        "\n		</p>";
}
function create_share(a) {
    var b = localStorage.notation + ":";
    b += $$("input,select")
        .map(function (a) {
            return a.value.replace(":", "");
        })
        .join(":");
    var c = location.href.replace(/[#?].*/, "");
    (c += "?" + LZString.compressToEncodedURIComponent(b)), a(c);
}
function exit_share() {
    history.pushState({}, "", "perks.html"),
        $("textarea").removeEventListener("click", exit_share),
        $$("[data-saved]").forEach(function (a) {
            return (a.value = localStorage[a.id] || a.value);
        });
}
function load_share(a) {
    var b = LZString.decompressFromEncodedURIComponent(a).split(":"),
        c = localStorage.notation;
    (localStorage.notation = b.shift()),
        $$("input,select").forEach(function (a) {
            return (a.value = b.shift());
        }),
        $("textarea").addEventListener("click", exit_share),
        $("form").submit(),
        (localStorage.notation = c || 1);
}
function prettify(a) {
    if (0 > a) return "-" + prettify(-a);
    if (1e4 > a) return +a.toPrecision(4) + "";
    if ("0" === localStorage.notation) return a.toExponential(2).replace("+", "");
    for (var b = 0; a >= 999.5;) (a /= 1e3), ++b;
    var c = notations[localStorage.notation || 1],
        d = b > c.length ? "e" + 3 * b : c[b - 1];
    return +a.toPrecision(3) + d;
}
function parse_suffixes(a) {
    a = a.replace(/\*.*|[^--9+a-z]/gi, "");
    for (
        var b = notations["3" === localStorage.notation ? 3 : 1], c = b.length;
        c > 0;
        --c
    )
        a = a.replace(new RegExp(b[c - 1] + "$", "i"), "E" + 3 * c);
    return +a;
}
function input(a) {
    return parse_suffixes($("#" + a).value);
}
function check_input(a) {
    var b = isFinite(parse_suffixes(a.value)),
        c = "3" === localStorage.notation ? "alphabetic " : "";
    a.setCustomValidity(b ? "" : "Invalid " + c + "number: " + a.value);
}
function mastery(a) {
    if (!game.talents[a]) throw "unknown mastery: " + a;
    return game.talents[a].purchased;
}
function toggle_spoilers() {
    $$("[data-hide]").forEach(function (a) {
        a.style.display =
            +localStorage.hze >= +a.getAttribute("data-hide") ? "" : "none";
    });
}
function set_hze(a) {
    +localStorage.hze > a || ((localStorage.hze = a), toggle_spoilers());
}
function handle_paste(a, b, c) {
    var d = a.clipboardData.getData("text/plain").replace(/\s/g, "");
    try {
        game = JSON.parse(LZString.decompressFromBase64(d));
        var e = 4.9,
            f = 4.91;
        game.global.version > f + 0.009
            ? show_alert(
                "warning",
                "This calculator only supports up to v" +
                f +
                " of Trimps, but your save is from v" +
                game.global.version +
                ". Results may be inaccurate."
            )
            : game.global.version < e &&
            show_alert(
                "warning",
                "Trimps v" +
                e +
                " is out! Your save is still on v" +
                game.global.version +
                ", so you should refresh the game’s page."
            );
    } catch (g) {
        if (game && game.Looting)
            throw "This is a perk string. You have to export your save (from the main screen), not your perks.";
        throw "Your clipboard did not contain a valid Trimps save. Open the game, click “Export” then “Copy to Clipboard”, and try again.";
    }
    (localStorage.save = d),
        (localStorage.notation = game.options.menu.standardNotation.enabled),
        (jobless = "Job" == game.global.ShieldEquipped.name),
        set_hze(game.global.highestLevelCleared + 1),
        b(),
        c();
}
function get_paste_back() {
    ($("#save").value = localStorage.save),
        ($("#save").onfocus = null),
        $("#save").focus(),
        $("#save").select();
}
var abs = Math.abs,
    ceil = Math.ceil,
    floor = Math.floor,
    log = Math.log,
    max = Math.max,
    min = Math.min,
    pow = Math.pow,
    round = Math.round,
    sqrt = Math.sqrt,
    jobless = !1,
    $ = function (a) {
        return document.querySelector(a);
    },
    $$ = function (a) {
        return [].slice.apply(document.querySelectorAll(a));
    };
$("#dark").disabled = !localStorage.dark;
var notations = [
    [],
    "KMBTQaQiSxSpOcNoDcUdDdTdQadQidSxdSpdOdNdVUvDvTvQavQivSxvSpvOvNvTgUtgDtgTtgQatgQitgSxtgSptgOtgNtgQaaUqaDqaTqaQaqaQiqaSxqaSpqaOqaNqaQiaUqiDqiTqiQaqiQiqiSxqiSpqiOqiNqiSxaUsxDsxTsxQasxQisxSxsxSpsxOsxNsxSpaUspDspTspQaspQispSxspSpspOspNspOgUogDogTogQaogQiogSxogSpogOogNogNaUnDnTnQanQinSxnSpnOnNnCtUc".split(
        /(?=[A-Z])/
    ),
    [],
    "a b c d e f g h i j k l m n o p q r s t u v w x y z aa ab ac ad ae af ag ah ai aj ak al am an ao ap aq ar as at au av aw ax ay az ba bb bc bd be bf bg bh bi bj bk bl bm bn bo bp bq br bs bt bu bv bw bx by bz ca cb cc cd ce cf cg ch ci cj ck cl cm cn co cp cq cr cs ct cu cv cw cx".split(
        " "
    ),
    "KMBTQaQiSxSpOcNoDcUdDdTdQadQidSxdSpdOdNdVUvDvTvQavQivSxvSpvOvNvTg".split(
        /(?=[A-Z])/
    ),
    [],
];
window.addEventListener("error", function (a) {
    return "string" == typeof a.error
        ? void show_alert("ko", a.error)
        : void (
            "Script error." != a.message &&
            create_share(function (b) {
                return show_alert(
                    "ko",
                    "Oops! It’s not your fault, but something went wrong. You can go pester the dev on\n	<a href=https://github.com/Grimy/Grimy.github.io/issues/new>GitHub</a> or\n	<a href=https://www.reddit.com/message/compose/?to=Grimy_>Reddit</a>, he’ll fix it.\n	If you do, please include the following data:<br>\n	<tt>" +
                    b +
                    "<br>" +
                    a.filename +
                    " l" +
                    (a.lineno || 0) +
                    "c" +
                    (a.colno || 0) +
                    " " +
                    a.message +
                    "</tt>."
                );
            })
        );
});
var game;
document.addEventListener("DOMContentLoaded", toggle_spoilers),
    document.addEventListener(
        "DOMContentLoaded",
        function () {
            var a = "2.4";
            a > localStorage.version &&
                show_alert(
                    "ok",
                    "Welcome to Trimps tools v" +
                    a +
                    "! See what’s new in the <a href=changelog.html>changelog</a>."
                ),
                (localStorage.version = a),
                location.search && load_share(location.search.substr(1)),
                $$("[data-saved]").forEach(function (a) {
                    "checkbox" === a.type
                        ? ((a.checked = "true" === localStorage[a.id]),
                            a.addEventListener("change", function () {
                                return (localStorage[a.id] = a.checked);
                            }))
                        : ((a.value = localStorage[a.id] || a.value),
                            a.addEventListener("change", function () {
                                return (localStorage[a.id] = a.value);
                            }));
                });
        },
        !1
    );
