(function() {
  var $, $doc, NOOP, ShadowcraftApp, ShadowcraftArtifact, ShadowcraftBackend, ShadowcraftConsole, ShadowcraftDpsGraph, ShadowcraftGear, ShadowcraftHistory, ShadowcraftOptions, ShadowcraftTalents, Templates, checkForWarnings, flash, hideFlash, json_encode, loadingSnapshot, modal, showPopup, tip, titleize, tooltip, wait,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  $ = window.jQuery;

  ShadowcraftApp = (function() {
    var _update;

    ShadowcraftApp.prototype.reload = function() {
      this.Options.initOptions();
      this.Talents.updateActiveTalents();
      return this.Gear.updateDisplay();
    };

    ShadowcraftApp.prototype.setupLabels = function(selector) {
      selector || (selector = document);
      selector = $(selector);
      selector.find('.label_check input:checkbox').each(function() {
        return $(this).parent()[(($(this).attr("checked") != null) || $(this).val() === "true" ? "add" : "remove") + "Class"]('c_on');
      });
      selector.find('.label_radio').removeClass('r_on');
      return selector.find('.label_radio input:checked').parent().addClass('r_on');
    };

    ShadowcraftApp.prototype.commonInit = function() {
      $("button, input:submit, .button").button();
      return this.setupLabels();
    };

    _update = function() {
      return Shadowcraft.trigger("update");
    };

    ShadowcraftApp.prototype.update = function() {
      if (this.updateThrottle) {
        this.updateThrottle = clearTimeout(this.updateThrottle);
      }
      return this.updateThrottle = setTimeout(_update, 50);
    };

    ShadowcraftApp.prototype.loadData = function() {
      return Shadowcraft.trigger("loadData");
    };

    function ShadowcraftApp() {
      _.extend(this, Backbone.Events);
    }

    ShadowcraftApp.prototype.boot = function(uuid1, region, data, ServerData) {
      var error, error1;
      this.uuid = uuid1;
      this.region = region;
      this.ServerData = ServerData;
      try {
        return this._boot(this.uuid, data, this.ServerData);
      } catch (error1) {
        error = error1;
        $("#curtain").html("<div id='loaderror'>A fatal error occurred while loading this page.</div>").show();
        wait();
        if (confirm("An unrecoverable error has occurred. Reset data and reload?")) {
          $.jStorage.flush();
          window.location.hash = "";
          return location.reload(true);
        } else {
          throw error;
        }
      }
    };

    ShadowcraftApp.prototype._boot = function(uuid1, data, ServerData) {
      var TypeError, base, error1, patch;
      this.uuid = uuid1;
      this.ServerData = ServerData;
      this.History = new ShadowcraftHistory(this).boot();
      patch = window.location.hash.match(/#reload$/);
      if (!this.History.loadFromFragment()) {
        try {
          this.Data = this.History.load(data);
          if (patch) {
            data.options = Object.deepExtend(this.Data.options, data.options);
            this.Data = _.extend(this.Data, data);
            this.Data.active = data.active;
            this.Data.activeSpec = data.activeSpec;
            this.Data.activeTalents = data.activeTalents;
          }
        } catch (error1) {
          TypeError = error1;
          this.Data = data;
        }
      }
      this.Data || (this.Data = data);
      (base = this.Data).options || (base.options = {});
      ShadowcraftApp.trigger("boot");
      this.Console = new ShadowcraftConsole(this);
      this.Backend = new ShadowcraftBackend(this).boot();
      this.Artifact = new ShadowcraftArtifact(this);
      this.Talents = new ShadowcraftTalents(this);
      this.Options = new ShadowcraftOptions(this).boot();
      this.Gear = new ShadowcraftGear(this);
      this.DpsGraph = new ShadowcraftDpsGraph(this);
      this.Artifact.boot();
      this.Talents.boot();
      this.Gear.boot();
      this.commonInit();
      $("#curtain").show();
      if (window.FLASH.length > 0) {
        setTimeout(function() {
          return flash("<p>" + (window.FLASH.join('</p><p>')) + "</p>");
        }, 1000);
      }
      $("#tabs").tabs({
        show: function(event, ui) {
          return $("ul.dropdownMenu").hide();
        }
      });
      $("body").bind("touchmove", function(event) {
        return event.preventDefault();
      });
      $("#tabs > .ui-tabs-panel").oneFingerScroll();
      $(".popup .body").oneFingerScroll();
      $("body").click(function() {
        return $("ul.dropdownMenu").hide();
      }).click();
      $("a.dropdown").bind("click", function() {
        var $this, menu, p, right, top;
        $this = $(this);
        menu = $("#" + $this.data("menu"));
        if (menu.is(":visible")) {
          $this.removeClass("active");
          menu.hide();
        } else {
          $this.addClass("active");
          p = $this.position();
          $this.css({
            zIndex: 102
          });
          top = p.top + $this.height() + 5;
          right = p.left;
          menu.css({
            top: top + "px",
            left: right + "px"
          }).show();
        }
        return false;
      });
      $("body").append("<div id='wait' style='display: none'><div id='waitMsg'></div></div><div id='modal' style='display: none'></div>");
      $(".showWait").click(function() {
        $("#modal").hide();
        return wait();
      });
      $("#reloadAllData").click(function() {
        if (confirm("Are you sure you want to clear all data?\n\nThis will wipe out all locally saved changes for ALL saved characters.\n\nThere is no undo!")) {
          $.jStorage.flush();
          location.hash = "";
          return location.reload(true);
        }
      });
      $(function() {
        return Shadowcraft.update();
      });
      this.setupLabels();
      return true;
    };

    ShadowcraftApp.prototype._T = function(str) {
      var idx, t;
      if (!this.Data.activeTalents) {
        return 0;
      }
      idx = _.indexOf(this.ServerData.TALENT_INDEX, str);
      t = this.Data.activeTalents[idx];
      if (!t) {
        return 0;
      }
      return parseInt(t, 10);
    };

    return ShadowcraftApp;

  })();

  _.extend(ShadowcraftApp, Backbone.Events);

  json_encode = $.toJSON || Object.toJSON || (window.JSON && (JSON.encode || JSON.stringify));

  NOOP = function() {
    return false;
  };

  $.fn.disableTextSelection = function() {
    return $(this).each(function() {
      if (typeof this.onselectstart !== "undefined") {
        return this.onselectstart = NOOP;
      } else if (typeof this.style.MozUserSelect !== "undefined") {
        return this.style.MozUserSelect = "none";
      } else {
        this.onmousedown = NOOP;
        return this.style.cursor = "default";
      }
    });
  };

  $.expr[':'].regex = function(elem, index, match) {
    var attr, matchParams, regex, validLabels;
    matchParams = match[3].split(',');
    validLabels = /^(data|css):/;
    attr = {
      method: matchParams[0].match(validLabels) ? matchParams[0].split(':')[0] : 'attr',
      property: matchParams.shift().replace(validLabels, '')
    };
    regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g, ''), 'ig');
    return regex.test(jQuery(elem)[attr.method](attr.property));
  };

  $.delegate = function(rules) {
    return function(e) {
      var bubbledTarget, selector, target;
      target = $(e.target);
      for (selector in rules) {
        bubbledTarget = target.closest(selector);
        if (bubbledTarget.length > 0) {
          return rules[selector].apply(bubbledTarget, $.makeArray(arguments));
        }
      }
    };
  };

  $.fn.oneFingerScroll = function() {
    return (function() {
      var scrollingElement, scrollingStart, touchedAt;
      scrollingElement = null;
      touchedAt = null;
      scrollingStart = null;
      return this.bind("touchstart", function(event) {
        if (event.originalEvent.touches.length === 1) {
          touchedAt = event.originalEvent.touches[0].pageY;
          scrollingElement = $(this);
          return scrollingStart = scrollingElement.scrollTop();
        }
      }).bind("touchmove", function(event) {
        var amt, touch;
        if (event.originalEvent.touches.length === 1) {
          touch = event.originalEvent.touches[0];
          amt = touch.pageY - touchedAt;
          scrollingElement.scrollTop(scrollingStart - amt);
          event.cancelBubble = true;
          event.stopPropagation();
          event.preventDefault();
          return false;
        }
      });
    }).call(this);
  };

  $.fn.sortElements = (function() {
    var shift, sort;
    shift = [].shift;
    sort = [].sort;
    return function(comparator) {
      var elems, parent, results;
      if (!(this && this.length > 0)) {
        return;
      }
      parent = this.get(0).parentNode;
      elems = this.detach();
      sort.call(elems, comparator);
      results = [];
      while (elems.length > 0) {
        results.push(parent.appendChild(shift.call(elems)));
      }
      return results;
    };
  })();

  modal = function(dialog) {
    $(dialog).detach();
    $("#wait").hide();
    return $("#modal").append(dialog).fadeIn();
  };

  Object.deepExtend = function(destination, source) {
    var property, value;
    for (property in source) {
      value = source[property];
      if (value && value.constructor && value.constructor === Object) {
        destination[property] || (destination[property] = {});
        arguments.callee(destination[property], value);
      } else {
        destination[property] = value;
      }
    }
    return destination;
  };

  Templates = null;

  ShadowcraftApp.bind("boot", function() {
    return Templates = {
      itemSlot: Handlebars.compile($("#template-itemSlot").html()),
      stats: Handlebars.compile($("#template-stats").html()),
      bonuses: Handlebars.compile($("#template-bonuses").html()),
      checkbox: Handlebars.compile($("#template-checkbox").html()),
      select: Handlebars.compile($("#template-select").html()),
      input: Handlebars.compile($("#template-input").html()),
      talentTree: Handlebars.compile($("#template-tree").html()),
      talentTier: Handlebars.compile($("#template-tier").html()),
      specActive: Handlebars.compile($("#template-specactive").html()),
      artifactActive: Handlebars.compile($("#template-artifactactive").html()),
      tooltip: Handlebars.compile($("#template-tooltip").html()),
      talentSet: Handlebars.compile($("#template-talent_set").html()),
      log: Handlebars.compile($("#template-log").html()),
      glyphSlot: Handlebars.compile($("#template-glyph_slot").html()),
      talentContribution: Handlebars.compile($("#template-talent_contribution").html()),
      loadSnapshots: Handlebars.compile($("#template-loadSnapshots").html()),
      artifactKingslayers: Handlebars.compile($("#template-artifactKingslayers").html()),
      artifactDreadblades: Handlebars.compile($("#template-artifactDreadblades").html()),
      artifactFangs: Handlebars.compile($("#template-artifactFangs").html())
    };
  });

  ShadowcraftBackend = (function() {
    var get_engine;

    get_engine = function() {
      var endpoint, port;
      switch (Shadowcraft.Data.options.general.patch) {
        case 63:
          port = 8880;
          endpoint = "engine-6.3";
          return "http://" + window.location.hostname + ":" + port + "/" + endpoint;
        default:
          port = 8881;
          endpoint = "engine-6.2";
          if (window.location.host.match(/:/)) {
            return "http://" + window.location.hostname + ":" + port + "/" + endpoint;
          } else {
            return "http://" + window.location.hostname + "/" + endpoint;
          }
      }
    };

    function ShadowcraftBackend(app1) {
      this.app = app1;
      this.app.Backend = this;
      _.extend(this, Backbone.Events);
    }

    ShadowcraftBackend.prototype.boot = function() {
      var self;
      self = this;
      Shadowcraft.bind("update", function() {
        return self.recompute();
      });
      return this;
    };

    ShadowcraftBackend.prototype.buildPayload = function() {
      var Gems, GlyphLookup, buffFood, buffList, data, g, gear_ids, glyph, glyph_list, item, j, k, key, len, len1, mh, n, oh, payload, ref, ref1, ref2, specName, statSummary, talentArray, talentString, val;
      data = Shadowcraft.Data;
      Gems = Shadowcraft.ServerData.GEM_LOOKUP;
      GlyphLookup = Shadowcraft.ServerData.GLYPH_LOOKUP;
      statSummary = Shadowcraft.Gear.sumStats();
      if (data.gear[15]) {
        mh = Shadowcraft.Gear.getItem(data.gear[15].original_id, data.gear[15].item_level, data.gear[15].suffix);
      }
      if (data.gear[16]) {
        oh = Shadowcraft.Gear.getItem(data.gear[16].original_id, data.gear[16].item_level, data.gear[16].suffix);
      }
      glyph_list = [];
      ref = data.glyphs;
      for (j = 0, len = ref.length; j < len; j++) {
        glyph = ref[j];
        if (GlyphLookup[glyph] != null) {
          glyph_list.push(GlyphLookup[glyph].ename);
        }
      }
      buffList = [];
      ref1 = data.options.buffs;
      for (key in ref1) {
        val = ref1[key];
        if (val) {
          buffList.push(ShadowcraftOptions.buffMap.indexOf(key));
        }
      }
      buffFood = ShadowcraftOptions.buffFoodMap.indexOf(data.options.buffs.food_buff);
      talentArray = data.activeTalents.split("");
      for (key = n = 0, len1 = talentArray.length; n < len1; key = ++n) {
        val = talentArray[key];
        talentArray[key] = (function() {
          switch (val) {
            case ".":
              return "0";
            case "0":
            case "1":
            case "2":
              return parseInt(val, 10) + 1;
          }
        })();
      }
      talentString = talentArray.join('');
      specName = {
        a: 'assassination',
        Z: 'combat',
        b: 'subtlety'
      }[data.activeSpec];
      data.options.rotation['opener_name'] = data.options.rotation["opener_name_" + specName];
      data.options.rotation['opener_use'] = data.options.rotation["opener_use_" + specName];
      payload = {
        r: data.options.general.race,
        l: data.options.general.level,
        pot: data.options.general.potion ? 1 : 0,
        prepot: data.options.general.prepot ? 1 : 0,
        b: buffList,
        bf: buffFood,
        ro: data.options.rotation,
        settings: {
          dmg_poison: data.options.general.lethal_poison,
          utl_poison: data.options.general.utility_poison !== 'n' ? data.options.general.utility_poison : void 0,
          duration: data.options.general.duration,
          response_time: data.options.general.response_time,
          time_in_execute_range: data.options.general.time_in_execute_range,
          pvp: data.options.general.pvp,
          num_boss_adds: data.options.general.num_boss_adds,
          latency: data.options.advanced.latency,
          adv_params: data.options.advanced.adv_params,
          night_elf_racial: data.options.general.night_elf_racial,
          demon_enemy: data.options.general.demon_enemy
        },
        spec: data.activeSpec,
        t: talentString,
        sta: [statSummary.strength || 0, statSummary.agility || 0, statSummary.attack_power || 0, statSummary.crit || 0, statSummary.haste || 0, statSummary.mastery || 0, statSummary.multistrike || 0, statSummary.versatility || 0, statSummary.resilience || 0, statSummary.pvp_power || 0],
        gly: glyph_list
      };
      if (mh != null) {
        payload.mh = [mh.speed, mh.dps * mh.speed, data.gear[15].enchant, mh.subclass];
      }
      if (oh != null) {
        payload.oh = [oh.speed, oh.dps * oh.speed, data.gear[16].enchant, oh.subclass];
      }
      gear_ids = [];
      ref2 = data.gear;
      for (k in ref2) {
        g = ref2[k];
        if (g.original_id) {
          item = [g.original_id, g.item_level];
          gear_ids.push(item);
        }
      }
      payload.g = gear_ids;
      return payload;
    };

    ShadowcraftBackend.prototype.recomputeFailed = function() {
      Shadowcraft.Console.remove(".error");
      return Shadowcraft.Console.warn({}, "Error contacting backend engine", null, "error", "error");
    };

    ShadowcraftBackend.prototype.handleRecompute = function(data) {
      Shadowcraft.Console.remove(".error");
      if (data.error) {
        Shadowcraft.Console.warn({}, data.error, null, "error", "error");
        return;
      }
      this.app.lastCalculation = data;
      return this.trigger("recompute", data);
    };

    ShadowcraftBackend.prototype.recompute = function(payload, forcePost) {
      if (payload == null) {
        payload = null;
      }
      if (forcePost == null) {
        forcePost = false;
      }
      this.cancelRecompute = false;
      payload || (payload = this.buildPayload());
      if (this.cancelRecompute || (payload == null)) {
        return;
      }
      if (window._gaq) {
        window._gaq.push(['_trackEvent', "Character", "Recompute"]);
      }
      if (window.WebSocket && !forcePost && false) {
        return this.recompute_via_websocket(payload);
      } else {
        return this.recompute_via_post(payload);
      }
    };

    ShadowcraftBackend.prototype.recompute_via_websocket = function(payload) {
      if (this.ws.readyState !== 1) {
        return this.recompute(payload, true);
      } else {
        return this.ws.send("m", payload);
      }
    };

    ShadowcraftBackend.prototype.recompute_via_post = function(payload) {
      if (/msie/.test(navigator.userAgent.toLowerCase()) && window.XDomainRequest) {
        return this.recompute_via_xdr(payload);
      } else {
        return this.recompute_via_xhr(payload);
      }
    };

    ShadowcraftBackend.prototype.recompute_via_xdr = function(payload) {
      var app, xdr;
      app = this;
      xdr = new XDomainRequest();
      xdr.open("get", get_engine() + ("?rnd=" + (new Date().getTime()) + "&data=") + JSON.stringify(payload));
      xdr.send();
      xdr.onload = function() {
        var data;
        data = JSON.parse(xdr.responseText);
        return app.handleRecompute(data);
      };
      return xdr.onerror = function() {
        app.recomputeFailed();
        flash("Error contacting backend engine");
        return false;
      };
    };

    ShadowcraftBackend.prototype.recompute_via_xhr = function(payload) {
      var app;
      app = this;
      return $.ajax({
        type: "POST",
        url: get_engine(),
        data: {
          data: $.toJSON(payload)
        },
        dataType: 'json',
        success: function(data) {
          return app.handleRecompute(data);
        },
        error: function(xhr, textStatus, error) {
          return app.recomputeFailed();
        }
      });
    };

    return ShadowcraftBackend;

  })();

  loadingSnapshot = false;

  ShadowcraftHistory = (function() {
    var DATA_VERSION, base10, base36Decode, base36Encode, base77, compress, compress_handlers, decompress, decompress_handlers, map, poisonMap, raceMap, rotationOptionsMap, rotationValueMap, unmap, utilPoisonMap;

    DATA_VERSION = 2;

    function ShadowcraftHistory(app1) {
      this.app = app1;
      this.app.History = this;
      Shadowcraft.Reset = this.reset;
    }

    ShadowcraftHistory.prototype.boot = function() {
      var app, buttons, menu;
      app = this;
      Shadowcraft.bind("update", function() {
        return app.save();
      });
      $("#doImport").click(function() {
        var json;
        json = $.parseJSON($("textarea#import").val());
        return app.loadSnapshot(json);
      });
      menu = $("#settingsDropdownMenu");
      menu.append("<li><a href='#' id='menuSaveSnapshot'>Save snapshot</li>");
      buttons = {
        Ok: function() {
          app.saveSnapshot($("#snapshotName").val());
          return $(this).dialog("close");
        },
        Cancel: function() {
          return $(this).dialog("close");
        }
      };
      $("#menuSaveSnapshot").click(function() {
        return $("#saveSnapshot").dialog({
          modal: true,
          buttons: buttons,
          open: function(event, ui) {
            var d, sn, t;
            sn = $("#snapshotName");
            t = ShadowcraftTalents.GetActiveSpecName();
            d = new Date();
            t += " " + (d.getFullYear()) + "-" + (d.getMonth() + 1) + "-" + (d.getDate());
            return sn.val(t);
          }
        });
      });
      $("#loadSnapshot").click($.delegate({
        ".selectSnapshot": function() {
          app.restoreSnapshot($(this).data("snapshot"));
          return $("#loadSnapshot").dialog("close");
        },
        ".deleteSnapshot": function() {
          app.deleteSnapshot($(this).data("snapshot"));
          $("#loadSnapshot").dialog("close");
          return $("#menuLoadSnapshot").click();
        }
      }));
      menu.append("<li><a href='#' id='menuLoadSnapshot'>Load snapshot</li>");
      $("#menuLoadSnapshot").click(function() {
        return app.selectSnapshot();
      });
      return this;
    };

    ShadowcraftHistory.prototype.save = function() {
      var data;
      if (this.app.Data != null) {
        data = compress(this.app.Data);
        this.persist(data);
        return $.jStorage.set(this.app.uuid, data);
      }
    };

    ShadowcraftHistory.prototype.saveSnapshot = function(name) {
      var key, snapshots;
      key = this.app.uuid + "snapshots";
      snapshots = $.jStorage.get(key, {});
      snapshots[name] = this.takeSnapshot();
      $.jStorage.set(key, snapshots);
      return flash(name + " has been saved");
    };

    ShadowcraftHistory.prototype.selectSnapshot = function() {
      var d, key, snapshots;
      key = this.app.uuid + "snapshots";
      snapshots = $.jStorage.get(key, {});
      d = $("#loadSnapshot");
      d.get(0).innerHTML = Templates.loadSnapshots({
        snapshots: _.keys(snapshots)
      });
      return d.dialog({
        modal: true,
        width: 500
      });
    };

    ShadowcraftHistory.prototype.restoreSnapshot = function(name) {
      var key, snapshots;
      key = this.app.uuid + "snapshots";
      snapshots = $.jStorage.get(key, {});
      this.loadSnapshot(snapshots[name]);
      return flash(name + " has been loaded");
    };

    ShadowcraftHistory.prototype.deleteSnapshot = function(name) {
      var key, snapshots;
      if (confirm("Delete this snapshot?")) {
        key = this.app.uuid + "snapshots";
        snapshots = $.jStorage.get(key, {});
        delete snapshots[name];
        $.jStorage.set(key, snapshots);
        return flash(name + " has been deleted");
      }
    };

    ShadowcraftHistory.prototype.load = function(defaults) {
      var data;
      data = $.jStorage.get(this.app.uuid, defaults);
      if (data instanceof Array && data.length !== 0) {
        data = decompress(data);
      } else {
        data = defaults;
      }
      return data;
    };

    ShadowcraftHistory.prototype.loadFromFragment = function() {
      var TypeError, error1, frag, hash, inflated, snapshot;
      hash = window.location.hash;
      if (hash && hash.match(/^#!/)) {
        frag = hash.substring(3);
        inflated = RawDeflate.inflate($.base64Decode(frag));
        snapshot = null;
        try {
          snapshot = $.parseJSON(inflated);
        } catch (error1) {
          TypeError = error1;
          snapshot = null;
        }
        if (snapshot != null) {
          this.loadSnapshot(snapshot);
          return true;
        }
      }
      return false;
    };

    ShadowcraftHistory.prototype.persist = function(data) {
      var frag, jd;
      this.lookups || (this.lookups = {});
      jd = json_encode(data);
      frag = $.base64Encode(RawDeflate.deflate(jd));
      if (window.history.replaceState) {
        return window.history.replaceState("loadout", "Latest settings", window.location.pathname.replace(/\/+$/, "") + "/#!/" + frag);
      } else {
        return window.location.hash = "!/" + frag;
      }
    };

    ShadowcraftHistory.prototype.reset = function() {
      if (confirm("This will wipe out any changes you've made. Proceed?")) {
        $.jStorage.deleteKey(uuid);
        return window.location.reload();
      }
    };

    ShadowcraftHistory.prototype.takeSnapshot = function() {
      return compress(this.app.Data);
    };

    ShadowcraftHistory.prototype.loadSnapshot = function(snapshot) {
      this.app.Data = decompress(snapshot);
      return Shadowcraft.loadData();
    };

    ShadowcraftHistory.prototype.buildExport = function() {
      var data, shavalue;
      data = json_encode(compress(this.app.Data));
      shavalue = sha1(data);
      console.log(shavalue);
      return $("#export").text(data);
    };

    base10 = "0123456789";

    base77 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    base36Encode = function(a) {
      var i, j, len, r, v;
      r = [];
      for (i = j = 0, len = a.length; j < len; i = ++j) {
        v = a[i];
        if (v === void 0 || v === null) {
          continue;
        } else if (v === 0) {
          r.push("");
        } else {
          r.push(convertBase(v.toString(), base10, base77));
        }
      }
      return r.join(";");
    };

    base36Decode = function(s) {
      var j, len, r, ref, v;
      r = [];
      ref = s.split(";");
      for (j = 0, len = ref.length; j < len; j++) {
        v = ref[j];
        if (v === "") {
          r.push(0);
        } else {
          r.push(parseInt(convertBase(v, base77, base10), 10));
        }
      }
      return r;
    };

    compress = function(data) {
      return compress_handlers[DATA_VERSION](data);
    };

    decompress = function(data) {
      var version;
      version = data[0].toString();
      if (decompress_handlers[version] == null) {
        throw new Error("Data version mismatch");
      }
      return decompress_handlers[version](data);
    };

    poisonMap = ["dp", "wp"];

    utilPoisonMap = ["lp", "n"];

    raceMap = ["Human", "Night Elf", "Worgen", "Dwarf", "Gnome", "Tauren", "Undead", "Orc", "Troll", "Blood Elf", "Goblin", "Draenei", "Pandaren"];

    rotationOptionsMap = ["min_envenom_size_non_execute", "min_envenom_size_execute", "ksp_immediately", "revealing_strike_pooling", "blade_flurry", "use_hemorrhage", "opener_name_assassination", "opener_use_assassination", "opener_name_combat", "opener_use_combat", "opener_name_subtlety", "opener_use_subtlety", "opener_name", "opener_use"];

    rotationValueMap = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "24", true, false, 'true', 'false', 'never', 'always', 'garrote', 'ambush', 'mutilate', 'sinister_strike', 'revealing_strike', 'opener', 'uptime'];

    map = function(value, m) {
      return m.indexOf(value);
    };

    unmap = function(value, m) {
      return m[value];
    };

    compress_handlers = {
      "2": function(data) {
        var advancedOptions, bonus, buff, buffFood, buffs, gear, gearSet, general, index, j, k, len, len1, len2, n, o, options, q, ref, ref1, ref2, ref3, ref4, ret, rotationOptions, set, slot, talent, talentSet, v;
        ret = [DATA_VERSION];
        gearSet = [];
        for (slot = j = 0; j <= 17; slot = ++j) {
          gear = data.gear[slot] || {};
          gearSet.push(gear.item_id || 0);
          gearSet.push(gear.enchant || 0);
          gearSet.push(gear.upgrade_level || 0);
          gearSet.push(gear.original_id || 0);
          gearSet.push(gear.item_level || 0);
          gearSet.push(Math.abs(gear.suffix) || 0);
          if (gear.gems) {
            gearSet.push(gear.gems[0] || 0);
            gearSet.push(gear.gems[1] || 0);
            gearSet.push(gear.gems[2] || 0);
          } else {
            gearSet.push(0);
            gearSet.push(0);
            gearSet.push(0);
          }
          if (gear.bonuses) {
            gearSet.push(Math.abs(gear.bonuses.length) || 0);
            ref = gear.bonuses;
            for (n = 0, len = ref.length; n < len; n++) {
              bonus = ref[n];
              gearSet.push(bonus);
            }
          } else {
            gearSet.push(0);
          }
        }
        ret.push(base36Encode(gearSet));
        ret.push(data.active);
        ret.push(data.activeSpec);
        ret.push(data.activeTalents);
        ret.push(base36Encode(data.glyphs));
        talentSet = [];
        ref1 = [0, 1];
        for (o = 0, len1 = ref1.length; o < len1; o++) {
          set = ref1[o];
          talent = data.talents[set];
          talentSet.push(talent.spec);
          talentSet.push(talent.talents);
          talentSet.push(base36Encode(talent.glyphs));
        }
        ret.push(talentSet);
        options = [];
        general = [data.options.general.level, map(data.options.general.race, raceMap), data.options.general.duration, map(data.options.general.lethal_poison, poisonMap), map(data.options.general.utility_poison, utilPoisonMap), data.options.general.potion ? 1 : 0, data.options.general.max_ilvl, data.options.general.prepot ? 1 : 0, data.options.general.patch, data.options.general.min_ilvl, data.options.general.epic_gems ? 1 : 0, data.options.general.pvp ? 1 : 0, data.options.general.show_upgrades ? 1 : 0, data.options.general.show_random_items || 600, data.options.general.num_boss_adds * 100 || 0, data.options.general.response_time * 100 || 50, data.options.general.time_in_execute_range * 100 || 35, data.options.general.night_elf_racial || 0, data.options.general.demon_enemy || 0];
        options.push(base36Encode(general));
        buffs = [];
        ref2 = ShadowcraftOptions.buffMap;
        for (index = q = 0, len2 = ref2.length; q < len2; index = ++q) {
          buff = ref2[index];
          v = data.options.buffs[buff];
          buffs.push(v ? 1 : 0);
        }
        options.push(buffs);
        rotationOptions = [];
        ref3 = data.options["rotation"];
        for (k in ref3) {
          v = ref3[k];
          rotationOptions.push(map(k, rotationOptionsMap));
          rotationOptions.push(map(v, rotationValueMap));
        }
        options.push(base36Encode(rotationOptions));
        advancedOptions = [];
        ref4 = data.options["advanced"];
        for (k in ref4) {
          v = ref4[k];
          advancedOptions.push(k);
          advancedOptions.push(v);
        }
        options.push(advancedOptions);
        buffFood = data.options.buffs.food_buff || 0;
        options.push(ShadowcraftOptions.buffFoodMap.indexOf(buffFood));
        ret.push(options);
        return ret;
      }
    };

    decompress_handlers = {
      "2": function(data) {
        var advanced, buffFood, d, gear, general, i, id, index, j, k, len, len1, len2, len3, n, numbonuses, o, options, q, ref, ref1, ref2, rotation, set, slot, talentSets, u, v, w;
        d = {
          gear: {},
          active: data[2],
          activeSpec: data[3],
          activeTalents: data[4],
          glyphs: base36Decode(data[5]),
          options: {},
          talents: []
        };
        talentSets = data[6];
        for (index = j = 0, len = talentSets.length; j < len; index = j += 3) {
          id = talentSets[index];
          set = (index / 3).toString();
          d.talents[set] = {
            spec: talentSets[index],
            talents: talentSets[index + 1],
            glyphs: base36Decode(talentSets[index + 2])
          };
        }
        gear = base36Decode(data[1]);
        index = 0;
        for (slot = n = 0; n <= 17; slot = ++n) {
          d.gear[slot] = {
            item_id: gear[index++],
            enchant: gear[index++],
            upgrade_level: gear[index++],
            original_id: gear[index++],
            item_level: gear[index++],
            suffix: gear[index++] * -1
          };
          d.gear[slot].gems = [];
          d.gear[slot].gems.push(gear[index++]);
          d.gear[slot].gems.push(gear[index++]);
          d.gear[slot].gems.push(gear[index++]);
          numbonuses = gear[index++];
          if (numbonuses !== 0) {
            d.gear[slot].bonuses = [];
          }
          for (o = 0, ref = numbonuses; 0 <= ref ? o < ref : o > ref; 0 <= ref ? o++ : o--) {
            d.gear[slot].bonuses.push(gear[index++]);
          }
          if (d.gear[slot].gems[0] === 0 && d.gear[slot].gems[1] === 0 && d.gear[slot].gems[2] === 0) {
            delete d.gear[slot].gems;
          }
          ref1 = d.gear[slot];
          for (k in ref1) {
            v = ref1[k];
            if (v === 0) {
              delete d.gear[slot][k];
            }
          }
        }
        options = data[7];
        general = base36Decode(options[0]);
        d.options.general = {
          level: general[0],
          race: unmap(general[1], raceMap),
          duration: general[2],
          lethal_poison: unmap(general[3], poisonMap),
          utility_poison: unmap(general[4], utilPoisonMap),
          potion: general[5] !== 0,
          max_ilvl: general[6] || 1000,
          prepot: general[7] !== 0,
          patch: general[8] || 60,
          min_ilvl: general[9] || 540,
          epic_gems: general[10] || 0,
          pvp: general[11] || 0,
          show_upgrades: general[12] || 0,
          show_random_items: general[13] || 0,
          num_boss_adds: general[14] / 100 || 0,
          response_time: general[15] / 100 || 0.5,
          time_in_execute_range: general[16] / 100 || 0.35,
          night_elf_racial: general[17] || 0,
          demon_enemy: general[18] || 0
        };
        d.options.buffs = {};
        ref2 = options[1];
        for (i = q = 0, len1 = ref2.length; q < len1; i = ++q) {
          v = ref2[i];
          d.options.buffs[ShadowcraftOptions.buffMap[i]] = v === 1;
        }
        rotation = base36Decode(options[2]);
        d.options.rotation = {};
        for (i = u = 0, len2 = rotation.length; u < len2; i = u += 2) {
          v = rotation[i];
          d.options.rotation[unmap(v, rotationOptionsMap)] = unmap(rotation[i + 1], rotationValueMap);
        }
        if (options[3]) {
          advanced = options[3];
          d.options.advanced = {};
          for (i = w = 0, len3 = advanced.length; w < len3; i = w += 2) {
            v = advanced[i];
            d.options.advanced[v] = advanced[i + 1];
          }
        }
        buffFood = options[4];
        d.options.buffs.food_buff = ShadowcraftOptions.buffFoodMap[buffFood];
        return d;
      }
    };

    return ShadowcraftHistory;

  })();

  titleize = function(str) {
    var f, i, j, len, r, s, sp, word;
    if (!str) {
      return "";
    }
    sp = str.split(/[ _]/);
    word = [];
    for (i = j = 0, len = sp.length; j < len; i = ++j) {
      s = sp[i];
      f = s.substring(0, 1).toUpperCase();
      r = s.substring(1).toLowerCase();
      word.push(f + r);
    }
    return word.join(' ');
  };

  tip = null;

  $doc = null;

  tooltip = function(data, x, y, ox, oy) {
    var rx, ry;
    tip = $("#tooltip");
    if (!tip || tip.length === 0) {
      tip = $("<div id='tooltip'></div>").addClass("ui-widget");
      $(document.body).append(tip);
      $doc = $(document.body);
    }
    tip.html(Templates.tooltip(data));
    tip.attr("class", data["class"]);
    x || (x = $.data(document, "mouse-x"));
    y || (y = $.data(document, "mouse-y"));
    rx = x + ox;
    ry = y + oy;
    if (rx + tip.outerWidth() > $doc.outerWidth()) {
      rx = x - tip.outerWidth() - ox;
    }
    if (ry + tip.outerHeight() > $doc.outerHeight()) {
      ry = y - tip.outerHeight() - oy;
    }
    return tip.css({
      top: ry,
      left: rx
    }).show();
  };

  hideFlash = function() {
    return $(".flash").fadeOut("fast");
  };

  flash = function(message) {
    var $flash, flashHide;
    $flash = $(".flash");
    if ($flash.length === 0) {
      $flash = $("<div class='flash'></div>");
      $flash.hide().click(function() {
        if (flashHide) {
          window.clearTimeout(flashHide);
        }
        return hideFlash();
      });
      $(document.body).append($flash);
    }
    $flash.html(message);
    if (!$flash.is(':visible')) {
      $(".flash").fadeIn(300);
    }
    if (flashHide) {
      window.clearTimeout(flashHide);
    }
    return flashHide = window.setTimeout(hideFlash, 1500);
  };

  checkForWarnings = function(section) {
    var EnchantLookup, EnchantSlots, data, enchant, enchantable, gear, i, item, j, len, ref, results, row, slotIndex, talents;
    Shadowcraft.Console.hide();
    data = Shadowcraft.Data;
    EnchantLookup = Shadowcraft.ServerData.ENCHANT_LOOKUP;
    EnchantSlots = Shadowcraft.ServerData.ENCHANT_SLOTS;
    if (section === void 0 || section === "options") {
      Shadowcraft.Console.remove(".options");
      if (parseInt(data.options.general.patch) < 60) {
        Shadowcraft.Console.warn({}, "You are using an old Engine. Please switch to the newest Patch and/or clear all saved data and refresh from armory.", null, 'warn', 'options');
      }
    }
    if (section === void 0 || section === "glyphs") {
      Shadowcraft.Console.remove(".glyphs");
      if (data.glyphs.length < 1) {
        Shadowcraft.Console.warn({}, "You have no Glyphs selected", null, 'warn', 'glyphs');
      }
    }
    if (section === void 0 || section === "talents") {
      Shadowcraft.Console.remove(".talents");
      if (data.activeTalents) {
        talents = data.activeTalents.split("");
        for (i = j = 0, len = talents.length; j < len; i = ++j) {
          row = talents[i];
          if ((i === 0 || i === 5) && row === ".") {
            Shadowcraft.Console.warn({}, "Level " + (i + 1) * 15 + " Talent not set", null, 'warn', 'talents');
          }
          if (i === 5 && row === "0") {
            Shadowcraft.Console.warn({}, "Talent Shuriken Toss is not fully supported by Shadowcraft.", "It is recommended to not use this talent.", 'warn', 'talents');
          }
        }
      }
    }
    if (section === void 0 || section === "gear") {
      Shadowcraft.Console.remove(".items");
      ref = data.gear;
      results = [];
      for (slotIndex in ref) {
        gear = ref[slotIndex];
        if (!gear || _.isEmpty(gear)) {
          continue;
        }
        item = Shadowcraft.Gear.getItem(gear.original_id, gear.item_level, gear.suffix);
        if (!item) {
          continue;
        }
        if (item.name.indexOf("Rune of Re-Origination") !== -1) {
          Shadowcraft.Console.warn(item, "is not fully supported but also bad for rogues.", "It is recommended to not use this trinket.", "warn", "items");
        }
        enchant = EnchantLookup[gear.enchant];
        enchantable = EnchantSlots[item.equip_location] !== void 0 && Shadowcraft.Gear.getApplicableEnchants(slotIndex, item).length > 0;
        if (!enchant && enchantable) {
          results.push(Shadowcraft.Console.warn(item, "needs an enchantment", null, "warn", "items"));
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  wait = function(msg) {
    msg || (msg = "");
    $("#waitMsg").html(msg);
    return $("#wait").data('timeout', setTimeout('$("#wait").show()', 1000));
  };

  showPopup = function(popup) {
    var $parent, body, ht, left, max, ot, speed, top;
    $(".popup").removeClass("visible");
    if (popup.find(".close-popup").length === 0) {
      popup.append("<a href='#' class='close-popup ui-dialog-titlebar-close ui-corner-all' role='button'><span class='ui-icon ui-icon-closethick'></span></a>");
      popup.find(".close-popup").click(function() {
        $(".popup").removeClass("visible");
        $(".slots").find(".active").removeClass("active");
        return false;
      }).hover(function() {
        return $(this).addClass('ui-state-hover');
      }, function() {
        return $(this).removeClass('ui-state-hover');
      });
    }
    $parent = popup.parents(".ui-tabs-panel");
    max = $parent.scrollTop() + $parent.outerHeight();
    top = $.data(document, "mouse-y") - 40 + $parent.scrollTop();
    if (top + popup.outerHeight() > max - 20) {
      top = max - 20 - popup.outerHeight();
    }
    if (top < 15) {
      top = 15;
    }
    left = $.data(document, "mouse-x") + 65;
    if (popup.width() + left > $parent.outerWidth() - 40) {
      left = popup.parents(".ui-tabs-panel").outerWidth() - popup.outerWidth() - 40;
    }
    popup.css({
      top: top + "px",
      left: left + "px"
    });
    popup.addClass("visible");
    ttlib.hide();
    body = popup.find(".body");
    $(".popup #filter input").val("");
    if (!Modernizr.touch) {
      $(".popup #filter input").focus();
    }
    ot = popup.find(".active").get(0);
    if (ot) {
      ht = ot.offsetTop - (popup.height() / 3);
      speed = ht / 1.3;
      if (speed > 500) {
        speed = 500;
      }
      return body.animate({
        scrollTop: ht
      }, speed, 'swing');
    }
  };

  ShadowcraftOptions = (function() {
    var cast, changeCheck, changeInput, changeOption, changeSelect, enforceBounds;

    ShadowcraftOptions.buffMap = ['short_term_haste_buff', 'stat_multiplier_buff', 'crit_chance_buff', 'haste_buff', 'multistrike_buff', 'attack_power_buff', 'mastery_buff', 'versatility_buff', 'flask_wod_agi'];

    ShadowcraftOptions.buffFoodMap = ['food_wod_versatility', 'food_wod_mastery', 'food_wod_crit', 'food_wod_haste', 'food_wod_multistrike', 'food_felmouth_frenzy'];

    cast = function(val, dtype) {
      switch (dtype) {
        case "integer":
          val = parseInt(val, 10);
          if (isNaN(val)) {
            val = 0;
          }
          break;
        case "float":
          val = parseFloat(val, 10);
          if (isNaN(val)) {
            val = 0;
          }
          break;
        case "bool":
          val = val === true || val === "true" || val === 1;
      }
      return val;
    };

    enforceBounds = function(val, mn, mx) {
      if (typeof val === "number") {
        if (mn && val < mn) {
          val = mn;
        } else if (mx && val > mx) {
          val = mx;
        }
      } else {
        return val;
      }
      return val;
    };

    ShadowcraftOptions.prototype.setup = function(selector, namespace, checkData) {
      var _k, _v, data, e0, exist, inputType, j, key, len, ns, opt, options, ref, ref1, s, template, templateOptions, val;
      data = Shadowcraft.Data;
      s = $(selector);
      for (key in checkData) {
        opt = checkData[key];
        ns = data.options[namespace];
        val = null;
        if (!ns) {
          data.options[namespace] = {};
          ns = data.options[namespace];
        }
        if (data.options[namespace][key] != null) {
          val = data.options[namespace][key];
        }
        if (val === null && (opt["default"] != null)) {
          val = opt["default"];
        }
        val = cast(val, opt.datatype);
        val = enforceBounds(val, opt.min, opt.max);
        data.options[namespace][key] = val;
        exist = s.find("#opt-" + namespace + "-" + key);
        inputType = "check";
        if (typeof opt === "object" && (opt.type != null)) {
          inputType = opt.type;
        }
        if (exist.length === 0) {
          switch (inputType) {
            case "check":
              template = Templates.checkbox;
              options = {
                label: typeof opt === "string" ? opt : opt.name
              };
              break;
            case "select":
              template = Templates.select;
              templateOptions = [];
              if (opt.options instanceof Array) {
                ref = opt.options;
                for (j = 0, len = ref.length; j < len; j++) {
                  _v = ref[j];
                  templateOptions.push({
                    name: _v + "",
                    value: _v
                  });
                }
              } else {
                ref1 = opt.options;
                for (_k in ref1) {
                  _v = ref1[_k];
                  templateOptions.push({
                    name: _v + "",
                    value: _k
                  });
                }
              }
              options = {
                options: templateOptions
              };
              break;
            case "input":
              template = Templates.input;
              options = {};
          }
          if (template) {
            s.append(template($.extend({
              key: key,
              label: opt.name,
              namespace: namespace,
              desc: opt.desc
            }, options)));
          }
          exist = s.find("#opt-" + namespace + "-" + key);
          e0 = exist.get(0);
          $.data(e0, "datatype", opt.datatype);
          $.data(e0, "min", opt.min);
          $.data(e0, "max", opt.max);
        }
        switch (inputType) {
          case "check":
            exist.attr("checked", val);
            exist.val(val);
            break;
          case "select":
          case "input":
            exist.val(val);
        }
      }
      return null;
    };

    ShadowcraftOptions.prototype.initOptions = function() {
      this.setup("#settings #general", "general", {
        patch: {
          type: "select",
          name: "Patch/Engine",
          'default': 60,
          datatype: 'integer',
          options: {
            60: '6.2'
          }
        },
        level: {
          type: "input",
          name: "Level",
          'default': 100,
          datatype: 'integer',
          min: 100,
          max: 100
        },
        race: {
          type: "select",
          options: ["Human", "Dwarf", "Orc", "Blood Elf", "Gnome", "Worgen", "Troll", "Night Elf", "Undead", "Goblin", "Pandaren"],
          name: "Race",
          'default': "Human"
        },
        night_elf_racial: {
          name: "Racial (Night Elf)",
          datatype: 'integer',
          type: 'select',
          options: {
            1: 'Day (1% Crit)',
            0: 'Night (1% Haste)'
          },
          "default": 0
        },
        duration: {
          type: "input",
          name: "Fight Duration",
          'default': 360,
          datatype: 'integer',
          min: 15,
          max: 1200
        },
        response_time: {
          type: "input",
          name: "Response Time",
          'default': 0.5,
          datatype: 'float',
          min: 0.1,
          max: 5
        },
        time_in_execute_range: {
          type: "input",
          name: "Time in Execute Range",
          desc: "Only used in Assassination Spec",
          'default': 0.35,
          datatype: 'float',
          min: 0,
          max: 1
        },
        lethal_poison: {
          name: "Lethal Poison",
          type: 'select',
          options: {
            'dp': 'Deadly Poison',
            'wp': 'Wound Poison'
          },
          'default': 'dp'
        },
        utility_poison: {
          name: "Utility Poison",
          type: 'select',
          options: {
            'lp': 'Leeching Poison',
            'n': 'Other/None'
          },
          'default': 'lp'
        },
        num_boss_adds: {
          name: "Number of Boss Adds",
          datatype: 'float',
          type: 'input',
          min: 0,
          max: 20,
          'default': 0
        },
        demon_enemy: {
          name: "Enemy is Demon",
          desc: "Enables damage buff from heirloom trinket against demons",
          datatype: 'integer',
          type: 'select',
          options: {
            1: 'Yes',
            0: 'No'
          },
          'default': 0
        }
      });
      this.setup("#settings #generalFilter", "general", {
        max_ilvl: {
          name: "Max ILevel",
          type: "input",
          desc: "Don't show items over this item level in gear lists",
          'default': 1000,
          datatype: 'integer',
          min: 540,
          max: 1000
        },
        min_ilvl: {
          name: "Min ILevel",
          type: "input",
          desc: "Don't show items under this item level in gear lists",
          'default': 540,
          datatype: 'integer',
          min: 540,
          max: 1000
        },
        show_random_items: {
          name: "Min ILvL (Random Items)",
          desc: "Don't show random items under this item level in gear lists",
          datatype: 'integer',
          type: 'input',
          min: 540,
          max: 1000,
          'default': 540
        },
        show_upgrades: {
          name: "Show Upgrades",
          desc: "Show all upgraded items in gear lists",
          datatype: 'integer',
          type: 'select',
          options: {
            1: 'Yes',
            0: 'No'
          },
          'default': 0
        },
        epic_gems: {
          name: "Recommend Epic Gems",
          datatype: 'integer',
          type: 'select',
          options: {
            1: 'Yes',
            0: 'No'
          }
        }
      });
      this.setup("#settings #playerBuffs", "buffs", {
        food_buff: {
          name: "Food Buff",
          type: 'select',
          datatype: 'string',
          "default": 'food_wod_versatility',
          options: {
            'food_wod_versatility': '125 Versatility',
            'food_wod_mastery': '125 Mastery',
            'food_wod_crit': '125 Crit',
            'food_wod_haste': '125 Haste',
            'food_wod_multistrike': '125 Multistrike',
            'food_felmouth_frenzy': 'Felmouth Frenzy'
          }
        },
        flask_wod_agi: {
          name: "Agility Flask",
          desc: "WoD Flask (200 Agility)",
          'default': true,
          datatype: 'bool'
        },
        short_term_haste_buff: {
          name: "+30% Haste/40 sec",
          desc: "Heroism/Bloodlust/Time Warp",
          'default': true,
          datatype: 'bool'
        },
        stat_multiplier_buff: {
          name: "5% All Stats",
          desc: "Blessing of Kings/Mark of the Wild/Legacy of the Emperor",
          'default': true,
          datatype: 'bool'
        },
        crit_chance_buff: {
          name: "5% Crit",
          desc: "Leader of the Pack/Arcane Brilliance/Legacy of the White Tiger",
          'default': true,
          datatype: 'bool'
        },
        haste_buff: {
          name: "5% Haste",
          desc: "Unleashed Rage/Unholy Aura/Swiftblade's Cunning",
          'default': true,
          datatype: 'bool'
        },
        multistrike_buff: {
          name: "5% Multistrike",
          desc: "Swiftblade's Cunning",
          'default': true,
          datatype: 'bool'
        },
        attack_power_buff: {
          name: "10% Attack Power",
          desc: "Horn of Winter/Trueshot Aura/Battle Shout",
          'default': true,
          datatype: 'bool'
        },
        mastery_buff: {
          name: "Mastery",
          desc: "Blessing of Might/Grace of Air",
          'default': true,
          datatype: 'bool'
        },
        versatility_buff: {
          name: "3% Versatility",
          desc: "",
          'default': true,
          datatype: 'bool'
        }
      });
      this.setup("#settings #raidOther", "general", {
        prepot: {
          type: "check",
          name: "Pre-pot",
          'default': false,
          datatype: 'bool'
        },
        potion: {
          type: "check",
          name: "Combat potion",
          'default': true,
          datatype: 'bool'
        }
      });
      this.setup("#settings #pvp", "general", {
        pvp: {
          type: "check",
          name: "PvP Mode",
          desc: "Activate the PvP Mode",
          'default': false,
          datatype: 'bool'
        }
      });
      this.setup("#settings section.mutilate .settings", "rotation", {
        min_envenom_size_non_execute: {
          type: "select",
          name: "Min CP/Envenom > 35%",
          options: [5, 4, 3, 2, 1],
          'default': 4,
          desc: "CP for Envenom when using Mutilate, no effect with Anticipation",
          datatype: 'integer',
          min: 1,
          max: 5
        },
        min_envenom_size_execute: {
          type: "select",
          name: "Min CP/Envenom < 35%",
          options: [5, 4, 3, 2, 1],
          'default': 5,
          desc: "CP for Envenom when using Dispatch, no effect with Anticipation",
          datatype: 'integer',
          min: 1,
          max: 5
        },
        opener_name_assassination: {
          type: "select",
          name: "Opener Name",
          options: {
            'mutilate': "Mutilate",
            'ambush': "Ambush",
            'garrote': "Garrote"
          },
          'default': 'ambush',
          datatype: 'string'
        },
        opener_use_assassination: {
          type: "select",
          name: "Opener Usage",
          options: {
            'always': "Always",
            'opener': "Start of the Fight",
            'never': "Never"
          },
          'default': 'always',
          datatype: 'string'
        }
      });
      this.setup("#settings section.combat .settings", "rotation", {
        ksp_immediately: {
          type: "select",
          name: "Killing Spree",
          options: {
            'true': "Killing Spree on cooldown",
            'false': "Wait for Bandit's Guile before using Killing Spree"
          },
          'default': 'true',
          datatype: 'string'
        },
        revealing_strike_pooling: {
          type: "check",
          name: "Pool for Revealing Strike",
          "default": true,
          datatype: 'bool'
        },
        blade_flurry: {
          type: "check",
          name: "Blade Flurry",
          desc: "Use Blade Flurry",
          "default": false,
          datatype: 'bool'
        },
        opener_name_combat: {
          type: "select",
          name: "Opener Name",
          options: {
            'sinister_strike': "Sinister Strike",
            'revealing_strike': "Revealing Strike",
            'ambush': "Ambush",
            'garrote': "Garrote"
          },
          'default': 'ambush',
          datatype: 'string'
        },
        opener_use_combat: {
          type: "select",
          name: "Opener Usage",
          options: {
            'always': "Always",
            'opener': "Start of the Fight",
            'never': "Never"
          },
          'default': 'always',
          datatype: 'string'
        }
      });
      this.setup("#settings section.subtlety .settings", "rotation", {
        use_hemorrhage: {
          type: "select",
          name: "CP Builder",
          options: {
            'never': "Backstab",
            'always': "Hemorrhage",
            'uptime': "Use Backstab and Hemorrhage for 100% DoT uptime"
          },
          "default": 'uptime',
          datatype: 'string'
        },
        opener_name_subtlety: {
          type: "select",
          name: "Opener Name",
          options: {
            'ambush': "Ambush",
            'garrote': "Garrote"
          },
          'default': 'ambush',
          datatype: 'string'
        },
        opener_use_subtlety: {
          type: "select",
          name: "Opener Usage",
          options: {
            'always': "Always",
            'opener': "Start of the Fight",
            'never': "Never"
          },
          'default': 'always',
          datatype: 'string'
        }
      });
      return this.setup("#settings #advancedSettings", "advanced", {
        latency: {
          type: "input",
          name: "Latency",
          'default': 0.03,
          datatype: 'float',
          min: 0.0,
          max: 5
        },
        adv_params: {
          type: "input",
          name: "Advanced Parameters",
          "default": "",
          datatype: 'string'
        }
      });
    };

    changeOption = function(elem, inputType, val) {
      var $this, base, data, dtype, max, min, name, ns, t0;
      $this = $(elem);
      data = Shadowcraft.Data;
      ns = elem.attr("data-ns") || "root";
      (base = data.options)[ns] || (base[ns] = {});
      name = $this.attr("name");
      if (val === void 0) {
        val = $this.val();
      }
      t0 = $this.get(0);
      dtype = $.data(t0, "datatype");
      min = $.data(t0, "min");
      max = $.data(t0, "max");
      val = enforceBounds(cast(val, dtype), min, max);
      if ($this.val() !== val) {
        $this.val(val);
      }
      if (inputType === "check") {
        $this.attr("checked", val);
      }
      data.options[ns][name] = val;
      Shadowcraft.Options.trigger("update", ns + "." + name, val);
      if ((ns !== 'advanced') || (name === 'latency' || name === 'adv_params')) {
        return Shadowcraft.update();
      }
    };

    changeCheck = function() {
      var $this;
      $this = $(this);
      changeOption($this, "check", $this.attr("checked") == null);
      return Shadowcraft.setupLabels("#settings,#advanced");
    };

    changeSelect = function() {
      return changeOption(this, "select");
    };

    changeInput = function() {
      return changeOption(this, "input");
    };

    ShadowcraftOptions.prototype.boot = function() {
      var app;
      app = this;
      this.initOptions();
      Shadowcraft.bind("loadData", function() {
        app.initOptions();
        Shadowcraft.setupLabels("#settings,#advanced");
        return $("#settings,#advanced select").change();
      });
      Shadowcraft.Talents.bind("changed", function() {
        $("#settings section.mutilate, #settings section.combat, #settings section.subtlety").hide();
        if (Shadowcraft.Data.activeSpec === "a") {
          return $("#settings section.mutilate").show();
        } else if (Shadowcraft.Data.activeSpec === "Z") {
          return $("#settings section.combat").show();
        } else {
          return $("#settings section.subtlety").show();
        }
      });
      return this;
    };

    function ShadowcraftOptions() {
      $("#settings,#advanced").bind("change", $.delegate({
        ".optionCheck": changeCheck
      }));
      $("#settings,#advanced").bind("change", $.delegate({
        ".optionSelect": changeSelect
      }));
      $("#settings,#advanced").bind("change", $.delegate({
        ".optionInput": changeInput
      }));
      _.extend(this, Backbone.Events);
    }

    return ShadowcraftOptions;

  })();

  ShadowcraftArtifact = (function() {
    var SPEC_ARTIFACT, displayDreadblades, displayFangs, displayKingslayers;

    SPEC_ARTIFACT = {
      "a": {
        icon: "inv_knife_1h_artifactgarona_d_01",
        text: "The Kingslayers"
      },
      "Z": {
        icon: "inv_sword_1h_artifactskywall_d_01",
        text: "The Dreadblades"
      },
      "b": {
        icon: "inv_knife_1h_artifactfangs_d_01",
        text: "Fangs of the Devourer"
      }
    };

    displayKingslayers = function() {
      var buffer;
      buffer = Templates.artifactKingslayers();
      return $("#artifactframe").get(0).innerHTML = buffer;
    };

    displayDreadblades = function() {
      var buffer;
      buffer = Templates.artifactDreadblades();
      return $("#artifactframe").get(0).innerHTML = buffer;
    };

    displayFangs = function() {
      var buffer;
      buffer = Templates.artifactFangs();
      return $("#artifactframe").get(0).innerHTML = buffer;
    };

    ShadowcraftArtifact.prototype.setSpec = function(str) {
      var artifactframe, buffer;
      buffer = Templates.artifactActive({
        name: SPEC_ARTIFACT[str].text,
        icon: SPEC_ARTIFACT[str].icon
      });
      $("#artifactactive").get(0).innerHTML = buffer;
      if (str === "a") {
        displayKingslayers();
      } else if (str === "Z") {
        displayDreadblades();
      } else if (str === "b") {
        displayFangs();
      }
      artifactframe = $("#artifactframe");
      $("#artifactframe .trait").each(function() {}).mousedown(function(e) {
        if (Modernizr.touch) {
          return;
        }
        switch (e.button) {
          case 0:
            return console.log("left click on ");
          case 2:
            return console.log("right click on ");
        }
      }).bind("contextmenu", function() {
        return false;
      }).mouseover($.delegate({
        ".tt": ttlib.requestTooltip
      })).mouseout($.delegate({
        ".tt": ttlib.hide
      })).bind("touchstart", function(e) {
        $.data(this, "removed", false);
        $.data(this, "listening", true);
        return $.data(tframe, "listening", this);
      }).bind("touchend", function(e) {
        $.data(this, "listening", false);
        if (!($.data(this, "removed") || !$(this).hasClass("active"))) {
          return console.log("touchend");
        }
      });
      return artifactframe.bind("touchstart", function(e) {
        var listening;
        listening = $.data(tframe, "listening");
        if (e.originalEvent.touches.length > 1 && listening && $.data(listening, "listening")) {
          console.log("touch start");
          return $.data(listening, "removed", true);
        }
      });
    };

    ShadowcraftArtifact.prototype.boot = function() {
      var app;
      app = this;
      Shadowcraft.bind("loadData", function() {
        var data, spec;
        data = Shadowcraft.Data;
        spec = data.activeSpec;
        return app.setSpec(spec);
      });
      Shadowcraft.Talents.bind("changedSpec", function(spec) {
        return app.setSpec(spec);
      });
      return this;
    };

    function ShadowcraftArtifact(app1) {
      this.app = app1;
      this.app.Artifact = this;
      this.displayKingslayers = displayKingslayers;
      this.displayDreadblades = displayDreadblades;
      this.displayFangs = displayFangs;
      _.extend(this, Backbone.Events);
    }

    return ShadowcraftArtifact;

  })();

  ShadowcraftTalents = (function() {
    var ALWAYS_SHOW_GLYPHS, CHARACTER_SPEC, DEFAULT_SPECS, MAX_TALENT_POINTS, SPEC_ICONS, TREE_SIZE, applyTalentToButton, getSpec, getSpecName, getTalents, glyphRankCount, hoverTalent, resetTalents, setGlyph, setSpec, setTalents, talentsSpent, toggleGlyph, updateGlyphWeights, updateTalentAvailability, updateTalentContribution;

    talentsSpent = 0;

    MAX_TALENT_POINTS = 7;

    TREE_SIZE = 7;

    ALWAYS_SHOW_GLYPHS = [];

    CHARACTER_SPEC = "";

    SPEC_ICONS = {
      "a": "ability_rogue_eviscerate",
      "Z": "ability_backstab",
      "b": "ability_stealth",
      "": "class_rogue"
    };

    DEFAULT_SPECS = {
      "Stock Assassination": {
        talents: "2211021",
        glyphs: [45761, 110853, 110850],
        spec: "a"
      },
      "Stock Combat": {
        talents: "2211011",
        glyphs: [110853, 110850],
        spec: "Z"
      },
      "Stock Subtlety": {
        talents: "1210011",
        glyphs: [42970, 63420, 110850],
        spec: "b"
      }
    };

    ShadowcraftTalents.GetActiveSpecName = function() {
      var activeSpec;
      activeSpec = getSpec();
      if (activeSpec) {
        return getSpecName(activeSpec);
      }
      return "";
    };

    getSpecName = function(s) {
      if (s === "a") {
        return "Assassination";
      } else if (s === "Z") {
        return "Combat";
      } else if (s === "b") {
        return "Subtlety";
      } else {
        return "Rogue";
      }
    };

    updateTalentAvailability = function(selector) {
      var talents;
      talents = selector ? selector.find(".talent") : $("#talentframe .tree .talent");
      talents.each(function() {
        var $this, icons, points, pos, tree;
        $this = $(this);
        pos = $.data(this, "position");
        points = $.data(this, "points");
        tree = $.data(pos.tree, "info");
        icons = $.data(this, "icons");
        if (tree.rowPoints[pos.row] >= 1 && points.cur !== 1) {
          return $this.css({
            backgroundImage: icons.grey
          }).removeClass("active");
        } else {
          return $this.css({
            backgroundImage: icons.normal
          }).addClass("active");
        }
      });
      Shadowcraft.Talents.trigger("changed");
      Shadowcraft.update();
      return checkForWarnings("talents");
    };

    hoverTalent = function() {
      var nextRank, points, pos, rank, talent;
      if (Modernizr.touch) {
        return;
      }
      points = $.data(this, "points");
      talent = $.data(this, "talent");
      rank = talent.rank.length ? talent.rank[points.cur - 1] : talent.rank;
      nextRank = talent.rank.length ? talent.rank[points.cur] : null;
      pos = $(this).offset();
      return tooltip({
        title: talent.name + " (" + points.cur + "/" + points.max + ")",
        desc: rank ? rank.description : null,
        nextdesc: nextRank ? "Next rank: " + nextRank.description : null
      }, pos.left, pos.top, 130, -20);
    };

    resetTalents = function() {
      var data;
      data = Shadowcraft.Data;
      $("#talentframe .talent").each(function() {
        var points;
        points = $.data(this, "points");
        return applyTalentToButton(this, -points.cur, true, true);
      });
      data.activeTalents = getTalents();
      return updateTalentAvailability();
    };

    setTalents = function(str) {
      var data;
      data = Shadowcraft.Data;
      if (!str) {
        updateTalentAvailability(null);
        return;
      }
      talentsSpent = 0;
      $("#talentframe .talent").each(function() {
        var p, points, position;
        position = $.data(this, "position");
        points = $.data(this, "points");
        p = 0;
        if (str[position.row] !== "." && position.col === parseInt(str[position.row], 10)) {
          p = 1;
        }
        return applyTalentToButton(this, p - points.cur, true, true);
      });
      data.activeTalents = getTalents();
      return updateTalentAvailability(null);
    };

    getTalents = function() {
      var talent_rows;
      talent_rows = ['.', '.', '.', '.', '.', '.', '.'];
      $("#talentframe .talent").each(function() {
        var points, position;
        position = $.data(this, "position");
        points = $.data(this, "points");
        if (points.cur === 1) {
          return talent_rows[position.row] = position.col;
        }
      });
      return talent_rows.join('');
    };

    setSpec = function(str) {
      var buffer, data;
      data = Shadowcraft.Data;
      buffer = Templates.specActive({
        name: getSpecName(str),
        icon: SPEC_ICONS[str]
      });
      $("#specactive").get(0).innerHTML = buffer;
      Shadowcraft.Talents.trigger("changedSpec", str);
      return data.activeSpec = str;
    };

    getSpec = function() {
      var data;
      data = Shadowcraft.Data;
      return data.activeSpec;
    };

    applyTalentToButton = function(button, dir, force, skipUpdate) {
      var data, points, position, success, tree;
      data = Shadowcraft.Data;
      points = $.data(button, "points");
      position = $.data(button, "position");
      tree = $.data(position.tree, "info");
      success = false;
      if (force) {
        success = true;
      } else if (dir === 1 && points.cur < points.max) {
        success = true;
        $("#talentframe .talent").each(function() {
          var points2, position2;
          position2 = $.data(this, "position");
          points2 = $.data(this, "points");
          if (points2.cur === 1 && position2.row === position.row) {
            return applyTalentToButton(this, -points2.cur);
          }
        });
      } else if (dir === -1) {
        success = true;
      }
      if (success) {
        points.cur += dir;
        tree.points += dir;
        talentsSpent += dir;
        tree.rowPoints[position.row] += dir;
        if (!skipUpdate) {
          data.activeTalents = getTalents();
          updateTalentAvailability($(button).parent());
        }
      }
      return success;
    };

    ShadowcraftTalents.prototype.updateActiveTalents = function() {
      var data;
      data = Shadowcraft.Data;
      if (!data.activeSpec) {
        data.activeTalents = data.talents[data.active].talents;
        data.activeSpec = data.talents[data.active].spec;
        data.glyphs = data.talents[data.active].glyphs;
      }
      setSpec(data.activeSpec);
      setTalents(data.activeTalents);
      return this.setGlyphs(data.glyphs);
    };

    ShadowcraftTalents.prototype.initTalentTree = function() {
      var TalentLookup, Talents, buffer, talentTiers, talentTrees, talentframe, tframe, tree, treeIndex;
      Talents = Shadowcraft.ServerData.TALENTS_WOD;
      TalentLookup = Shadowcraft.ServerData.TALENT_LOOKUP_WOD;
      buffer = "";
      talentTiers = [
        {
          tier: "0",
          level: "15"
        }, {
          tier: "1",
          level: "30"
        }, {
          tier: "2",
          level: "45"
        }, {
          tier: "3",
          level: "60"
        }, {
          tier: "4",
          level: "75"
        }, {
          tier: "5",
          level: "90"
        }, {
          tier: "6",
          level: "100"
        }
      ];
      talentTiers = _.filter(talentTiers, function(tier) {
        return tier.level <= (Shadowcraft.Data.options.general.level || 100);
      });
      buffer += Templates.talentTier({
        background: 1,
        levels: talentTiers
      });
      for (treeIndex in Talents) {
        tree = Talents[treeIndex];
        tree = _.filter(tree, function(talent) {
          return parseInt(talent.tier, 10) <= (talentTiers.length - 1);
        });
        buffer += Templates.talentTree({
          background: 1,
          talents: tree
        });
      }
      talentframe = $("#talentframe");
      tframe = talentframe.get(0);
      tframe.innerHTML = buffer;
      $(".tree, .tree .talent, .tree .talent").disableTextSelection();
      talentTrees = $("#talentframe .tree");
      $("#talentframe .talent").each(function() {
        var $this, col, myTree, row, talent, trees;
        row = parseInt(this.className.match(/row-(\d)/)[1], 10);
        col = parseInt(this.className.match(/col-(\d)/)[1], 10);
        $this = $(this);
        trees = $this.closest(".tree");
        myTree = trees.get(0);
        tree = talentTrees.index(myTree);
        talent = TalentLookup[row + ":" + col];
        $.data(this, "position", {
          tree: myTree,
          treeIndex: tree,
          row: row,
          col: col
        });
        $.data(myTree, "info", {
          points: 0,
          rowPoints: [0, 0, 0, 0, 0, 0, 0]
        });
        $.data(this, "talent", talent);
        $.data(this, "points", {
          cur: 0,
          max: talent.maxRank
        });
        return $.data(this, "icons", {
          grey: $this.css("backgroundImage"),
          normal: $this.css("backgroundImage").replace(/\/grey\//, "/")
        });
      }).mousedown(function(e) {
        if (Modernizr.touch) {
          return;
        }
        switch (e.button) {
          case 0:
            if (applyTalentToButton(this, 1)) {
              Shadowcraft.update();
            }
            break;
          case 2:
            if (!$(this).hasClass("active")) {
              return;
            }
            if (applyTalentToButton(this, -1)) {
              Shadowcraft.update();
            }
        }
        return $(this).trigger("mouseenter");
      }).bind("contextmenu", function() {
        return false;
      }).mouseenter($.delegate({
        ".tt": ttlib.requestTooltip
      })).mouseleave($.delegate({
        ".tt": ttlib.hide
      })).bind("touchstart", function(e) {
        $.data(this, "removed", false);
        $.data(this, "listening", true);
        return $.data(tframe, "listening", this);
      }).bind("touchend", function(e) {
        $.data(this, "listening", false);
        if (!($.data(this, "removed") || !$(this).hasClass("active"))) {
          if (applyTalentToButton(this, 1)) {
            return Shadowcraft.update();
          }
        }
      });
      return talentframe.bind("touchstart", function(e) {
        var listening;
        listening = $.data(tframe, "listening");
        if (e.originalEvent.touches.length > 1 && listening && $.data(listening, "listening")) {
          if (applyTalentToButton.call(listening, listening, -1)) {
            Shadowcraft.update();
          }
          return $.data(listening, "removed", true);
        }
      });
    };

    ShadowcraftTalents.prototype.initTalentsPane = function() {
      var buffer, data, j, len, ref, talent, talentName, talentSet;
      this.initTalentTree();
      data = Shadowcraft.Data;
      buffer = "";
      ref = data.talents;
      for (j = 0, len = ref.length; j < len; j++) {
        talent = ref[j];
        buffer += Templates.talentSet({
          talent_string: talent.talents,
          glyphs: talent.glyphs.join(","),
          name: "Imported " + getSpecName(talent.spec),
          spec: talent.spec
        });
      }
      for (talentName in DEFAULT_SPECS) {
        talentSet = DEFAULT_SPECS[talentName];
        buffer += Templates.talentSet({
          talent_string: talentSet.talents,
          glyphs: talentSet.glyphs.join(","),
          name: talentName,
          spec: talentSet.spec
        });
      }
      $("#talentsets").get(0).innerHTML = buffer;
      return this.updateActiveTalents();
    };

    ShadowcraftTalents.prototype.setGlyphs = function(glyphs) {
      Shadowcraft.Data.glyphs = glyphs;
      return this.updateGlyphDisplay();
    };

    ShadowcraftTalents.prototype.initGlyphs = function() {
      var Glyphs, buffer, data, g, idx, j, len;
      buffer = [null, "", ""];
      Glyphs = Shadowcraft.ServerData.GLYPHS;
      data = Shadowcraft.Data;
      if (!data.glyphs) {
        data.glyphs = data.talents[data.active].glyphs;
      }
      for (idx = j = 0, len = Glyphs.length; j < len; idx = ++j) {
        g = Glyphs[idx];
        buffer[g.rank] += Templates.glyphSlot(g);
      }
      $("#major-glyphs .inner").get(0).innerHTML = buffer[1];
      $("#minor-glyphs .inner").get(0).innerHTML = buffer[2];
      return this.updateGlyphDisplay();
    };

    ShadowcraftTalents.prototype.updateGlyphDisplay = function() {
      var Glyphs, data, g, glyph, idx, j, len, ref;
      Glyphs = Shadowcraft.ServerData.GLYPHS;
      data = Shadowcraft.Data;
      if (data.glyphs == null) {
        return;
      }
      for (idx = j = 0, len = Glyphs.length; j < len; idx = ++j) {
        glyph = Glyphs[idx];
        g = $(".glyph_slot[data-id='" + glyph.id + "']");
        if (ref = glyph.id, indexOf.call(data.glyphs, ref) >= 0) {
          setGlyph(g, true);
        } else {
          setGlyph(g, false);
        }
      }
      return checkForWarnings('glyphs');
    };

    updateGlyphWeights = function(data) {
      var g, glyphSet, glyphSets, id, j, key, len, len1, max, n, ref, results, slot, weight, width;
      max = _.max(data.glyph_ranking);
      $(".glyph_slot .pct-inner").css({
        width: 0
      });
      ref = data.glyph_ranking;
      for (key in ref) {
        weight = ref[key];
        g = Shadowcraft.ServerData.GLYPHNAME_LOOKUP[key];
        if (g) {
          width = weight / max * 100;
          slot = $(".glyph_slot[data-id='" + g.id + "']");
          $.data(slot[0], "weight", weight);
          slot.show().find(".pct-inner").css({
            width: width + "%"
          });
          slot.find(".label").text(weight.toFixed(1) + " DPS");
        }
      }
      for (j = 0, len = ALWAYS_SHOW_GLYPHS.length; j < len; j++) {
        id = ALWAYS_SHOW_GLYPHS[j];
        $(".glyph_slot[data-id='" + id + "']").show();
      }
      glyphSets = $(".glyphset");
      results = [];
      for (n = 0, len1 = glyphSets.length; n < len1; n++) {
        glyphSet = glyphSets[n];
        results.push($(glyphSet).find(".glyph_slot").sortElements(function(a, b) {
          var aa, an, aw, ba, bn, bw, gl;
          gl = Shadowcraft.ServerData.GLYPH_LOOKUP;
          aa = $(a).hasClass("activated") ? 1 : 0;
          ba = $(b).hasClass("activated") ? 1 : 0;
          aw = $.data(a, "weight");
          bw = $.data(b, "weight");
          if (gl) {
            an = gl[$.data(a, "id")].name;
            bn = gl[$.data(b, "id")].name;
          }
          aw || (aw = -1);
          bw || (bw = -1);
          an || (an = "");
          bn || (bn = "");
          if (aw !== bw) {
            if (aw > bw) {
              return -1;
            } else {
              return 1;
            }
          } else {
            if (aa !== ba) {
              if (aa > ba) {
                return -1;
              } else {
                return 1;
              }
            } else {
              if (an > bn) {
                return 1;
              } else {
                return -1;
              }
            }
          }
        }));
      }
      return results;
    };

    glyphRankCount = function(rank, g) {
      var GlyphLookup, count, data, glyph, j, len, ref;
      data = Shadowcraft.Data;
      GlyphLookup = Shadowcraft.ServerData.GLYPH_LOOKUP;
      if (g && !rank) {
        rank = GlyphLookup[g].rank;
      }
      count = 0;
      ref = data.glyphs;
      for (j = 0, len = ref.length; j < len; j++) {
        glyph = ref[j];
        if (GlyphLookup[glyph] != null) {
          if (GlyphLookup[glyph].rank === rank) {
            count++;
          }
        }
      }
      return count;
    };

    setGlyph = function(e, active) {
      var $e, $set, id;
      $e = $(e);
      $set = $e.parents(".glyphset");
      id = parseInt($e.data("id"), 10);
      if (active) {
        $e.addClass("activated");
      } else {
        $e.removeClass("activated");
        $set.removeClass("full");
      }
      if (glyphRankCount(null, id) >= 3) {
        return $set.addClass("full");
      } else {
        return $set.removeClass("full");
      }
    };

    toggleGlyph = function(e, override) {
      var $e, $set, data, id;
      data = Shadowcraft.Data;
      $e = $(e);
      $set = $e.parents(".glyphset");
      id = parseInt($e.data("id"), 10);
      if ($e.hasClass("activated")) {
        $e.removeClass("activated");
        data.glyphs = _.without(data.glyphs, id);
        $set.removeClass("full");
      } else {
        if (glyphRankCount(null, id) >= 3 && !override) {
          return;
        }
        $e.addClass("activated");
        if (!override && data.glyphs.indexOf(id) === -1) {
          data.glyphs.push(id);
        }
        if (glyphRankCount(null, id) >= 3) {
          $set.addClass("full");
        }
      }
      checkForWarnings('glyphs');
      return Shadowcraft.update();
    };

    updateTalentContribution = function(LC) {
      var buffer, exist, k, max, name, pct, rankings, s, setKey, setVal, sets, target, val;
      if (!LC.talent_ranking) {
        return;
      }
      sets = {
        "Primary": LC.talent_ranking
      };
      rankings = _.extend({}, LC.talent_ranking);
      max = _.max(rankings);
      $("#talentrankings .talent_contribution").hide();
      for (setKey in sets) {
        setVal = sets[setKey];
        buffer = "";
        target = $("#talentrankings ." + setKey);
        for (k in setVal) {
          s = setVal[k];
          exist = $("#talentrankings #talent-weight-" + k);
          val = parseInt(s, 10);
          name = k.replace(/_/g, " ").capitalize;
          if (isNaN(val)) {
            name += " (NYI)";
            val = 0;
          }
          pct = val / max * 100 + 0.01;
          if (exist.length === 0) {
            buffer = Templates.talentContribution({
              name: name,
              raw_name: k,
              val: val.toFixed(1),
              width: pct
            });
            target.append(buffer);
          }
          exist = $("#talentrankings #talent-weight-" + k);
          $.data(exist.get(0), "val", val);
          exist.show().find(".pct-inner").css({
            width: pct + "%"
          });
          exist.find(".name").text(name);
          exist.find(".label").text(val.toFixed(1));
        }
      }
      return $("#talentrankings .talent_contribution").sortElements(function(a, b) {
        var ad, bd;
        ad = $.data(a, "val");
        bd = $.data(b, "val");
        if (ad > bd) {
          return -1;
        } else {
          return 1;
        }
      });
    };

    ShadowcraftTalents.prototype.boot = function() {
      var app;
      this.initTalentsPane();
      this.initGlyphs();
      app = this;
      Shadowcraft.Backend.bind("recompute", updateTalentContribution);
      Shadowcraft.Backend.bind("recompute", updateGlyphWeights);
      $("#glyphs").click($.delegate({
        ".glyph_slot": function() {
          return toggleGlyph(this);
        }
      })).mouseover($.delegate({
        ".glyph_slot": ttlib.requestTooltip
      })).mouseout($.delegate({
        ".glyph_slot": ttlib.hide
      }));
      $("#talentsets").click($.delegate({
        ".talent_set": function() {
          var glyph, glyphs, i, j, len, spec, talents;
          spec = $(this).data("spec");
          talents = $(this).data("talents") + "";
          glyphs = ($(this).data("glyphs") + "" || "").split(",");
          for (i = j = 0, len = glyphs.length; j < len; i = ++j) {
            glyph = glyphs[i];
            glyphs[i] = parseInt(glyph, 10);
          }
          glyphs = _.compact(glyphs);
          setSpec(spec);
          Shadowcraft.Artifact.setSpec(spec);
          setTalents(talents);
          return app.setGlyphs(glyphs);
        }
      }));
      $("#reset_talents").click(resetTalents);
      Shadowcraft.bind("loadData", function() {
        return app.updateActiveTalents();
      });
      Shadowcraft.Options.bind("update", function(opt, val) {
        if (opt === 'general.patch' || opt === 'general.level') {
          app.initTalentTree();
          app.updateActiveTalents();
          return checkForWarnings('options');
        }
      });
      $("#talents #talentframe").mousemove(function(e) {
        $.data(document, "mouse-x", e.pageX);
        return $.data(document, "mouse-y", e.pageY);
      });
      return this;
    };

    function ShadowcraftTalents(app1) {
      this.app = app1;
      this.app.Talents = this;
      this.resetTalents = resetTalents;
      this.setTalents = setTalents;
      this.getTalents = getTalents;
      _.extend(this, Backbone.Events);
    }

    return ShadowcraftTalents;

  })();

  ShadowcraftGear = (function() {
    var $altslots, $popup, $slots, EP_PRE_REGEM, EP_TOTAL, FACETS, PROC_ENCHANTS, SLOT_DISPLAY_ORDER, SLOT_INVTYPES, SLOT_ORDER, Sets, Weights, __epSort, applyBonusToItem, canUseGem, clearBonuses, clickItemLock, clickItemUpgrade, clickSlot, clickSlotBonuses, clickSlotEnchant, clickSlotGem, clickSlotName, clickWowhead, epSort, equalGemStats, getApplicableEnchants, getBaseItemLevel, getBestNormalGem, getEnchantRecommendation, getEquippedSetCount, getGemRecommendationList, getGemmingRecommendation, getItem, getItems, getMaxUpgradeLevel, getRandPropRow, getStatWeight, getUpgradeLevelSteps, get_ep, isProfessionalGem, needsDagger, setBonusEP, statOffset, statsToDesc, sumItem, updateDpsBreakdown, updateEngineInfoWindow, updateStatWeights;

    FACETS = {
      ITEM: 1,
      GEMS: 2,
      ENCHANT: 4,
      ALL: 255
    };

    ShadowcraftGear.FACETS = FACETS;

    SLOT_ORDER = ["0", "1", "2", "14", "4", "8", "9", "5", "6", "7", "10", "11", "12", "13", "15", "16"];

    SLOT_DISPLAY_ORDER = [["0", "1", "2", "14", "4", "8", "15", "16"], ["9", "5", "6", "7", "10", "11", "12", "13"]];

    PROC_ENCHANTS = {
      5330: "mark_of_the_thunderlord",
      5331: "mark_of_the_shattered_hand",
      5334: "mark_of_the_frostwolf",
      5337: "mark_of_warsong",
      5384: "mark_of_the_bleeding_hollow"
    };

    Sets = {
      T17: {
        ids: [115570, 115571, 115572, 115573, 115574],
        bonuses: {
          4: "rogue_t17_4pc",
          2: "rogue_t17_2pc"
        }
      },
      T17_LFR: {
        ids: [120384, 120383, 120382, 120381, 120380, 120379],
        bonuses: {
          4: "rogue_t17_4pc_lfr"
        }
      },
      T18: {
        ids: [124248, 124257, 124263, 124269, 124274],
        bonuses: {
          4: "rogue_t18_4pc",
          2: "rogue_t18_2pc"
        }
      },
      T18_LFR: {
        ids: [128130, 128121, 128125, 128054, 128131, 128137],
        bonuses: {
          4: "rogue_t18_4pc_lfr"
        }
      }
    };

    Weights = {
      attack_power: 1,
      agility: 1.1,
      crit: 0.87,
      haste: 1.44,
      mastery: 1.15,
      multistrike: 1.12,
      versatility: 1.2,
      strength: 1.05,
      pvp_power: 0
    };

    ShadowcraftGear.prototype.getWeights = function() {
      return Weights;
    };

    SLOT_INVTYPES = {
      0: 1,
      1: 2,
      2: 3,
      14: 16,
      4: 5,
      8: 9,
      9: 10,
      5: 6,
      6: 7,
      7: 8,
      10: 11,
      11: 11,
      12: 12,
      13: 12,
      15: "mainhand",
      16: "offhand"
    };

    EP_PRE_REGEM = null;

    EP_TOTAL = null;

    $slots = null;

    $altslots = null;

    $popup = null;

    getRandPropRow = function(slotIndex) {
      slotIndex = parseInt(slotIndex, 10);
      switch (slotIndex) {
        case 0:
        case 4:
        case 6:
          return 0;
        case 2:
        case 5:
        case 7:
        case 9:
        case 12:
        case 13:
          return 1;
        case 1:
        case 8:
        case 10:
        case 11:
        case 14:
          return 2;
        case 15:
        case 16:
          return 3;
        default:
          return 2;
      }
    };

    statOffset = function(gear, facet) {
      var offsets;
      offsets = {};
      if (gear) {
        Shadowcraft.Gear.sumSlot(gear, offsets, facet);
      }
      return offsets;
    };

    sumItem = function(s, i, key) {
      var stat;
      key || (key = "stats");
      for (stat in i[key]) {
        s[stat] || (s[stat] = 0);
        s[stat] += i[key][stat];
      }
      return null;
    };

    get_ep = function(item, key, slot, ignore) {
      var c, enchant, item_level, pre, proc_name, stat, stats, total, value, weight;
      stats = {};
      sumItem(stats, item, key);
      total = 0;
      for (stat in stats) {
        value = stats[stat];
        weight = getStatWeight(stat, value, ignore) || 0;
        total += weight;
      }
      c = Shadowcraft.lastCalculation;
      if (c && key !== "socketbonus") {
        if (item.dps) {
          if (slot === 15) {
            total += (item.dps * c.mh_ep.mh_dps) + c.mh_speed_ep["mh_" + item.speed];
            if (c.mh_type_ep != null) {
              if (item.subclass === 15) {
                total += c.mh_type_ep["mh_type_dagger"];
              } else {
                total += c.mh_type_ep["mh_type_one-hander"];
              }
            }
          } else if (slot === 16) {
            total += (item.dps * c.oh_ep.oh_dps) + c.oh_speed_ep["oh_" + item.speed];
            if (c.oh_type_ep != null) {
              if (item.subclass === 15) {
                total += c.oh_type_ep["oh_type_dagger"];
              } else {
                total += c.oh_type_ep["oh_type_one-hander"];
              }
            }
          }
        } else if (PROC_ENCHANTS[item.id]) {
          switch (slot) {
            case 14:
              pre = "";
              break;
            case 15:
              pre = "mh_";
              break;
            case 16:
              pre = "oh_";
          }
          enchant = PROC_ENCHANTS[item.id];
          if (!pre && enchant) {
            total += c["other_ep"][enchant];
          } else if (pre && enchant) {
            total += c[pre + "ep"][pre + enchant];
          }
        }
        item_level = item.ilvl;
        if (c.trinket_map[item.original_id]) {
          proc_name = c.trinket_map[item.original_id];
          if (c.proc_ep[proc_name] && c.proc_ep[proc_name][item_level]) {
            total += c.proc_ep[proc_name][item_level];
          } else {
            console.warn("error in trinket_ranking", item_level, item.name);
          }
        }
      }
      return total;
    };

    ShadowcraftGear.prototype.sumSlot = function(gear, out, facets) {
      var EnchantLookup, Gems, enchant, enchant_id, gem, gid, item, matchesAllSockets, ref, socket, socketIndex;
      if ((gear != null ? gear.item_id : void 0) == null) {
        return;
      }
      facets || (facets = FACETS.ALL);
      Gems = Shadowcraft.ServerData.GEM_LOOKUP;
      EnchantLookup = Shadowcraft.ServerData.ENCHANT_LOOKUP;
      item = getItem(gear.original_id, gear.item_level, gear.suffix);
      if (item == null) {
        return;
      }
      if ((facets & FACETS.ITEM) === FACETS.ITEM) {
        sumItem(out, item);
      }
      if ((facets & FACETS.GEMS) === FACETS.GEMS) {
        matchesAllSockets = item.sockets && item.sockets.length > 0;
        ref = item.sockets;
        for (socketIndex in ref) {
          socket = ref[socketIndex];
          gid = gear.gems[socketIndex];
          if (gid && gid > 0) {
            gem = Gems[gid];
            if (gem) {
              sumItem(out, gem);
            }
          }
          if (!gem || !gem[socket]) {
            matchesAllSockets = false;
          }
        }
        if (matchesAllSockets) {
          sumItem(out, item, "socketbonus");
        }
      }
      if ((facets & FACETS.ENCHANT) === FACETS.ENCHANT) {
        enchant_id = gear.enchant;
        if (enchant_id && enchant_id > 0) {
          enchant = EnchantLookup[enchant_id];
          if (enchant) {
            return sumItem(out, enchant);
          }
        }
      }
    };

    ShadowcraftGear.prototype.sumStats = function(facets) {
      var data, i, j, len, si, stats;
      stats = {};
      data = Shadowcraft.Data;
      for (i = j = 0, len = SLOT_ORDER.length; j < len; i = ++j) {
        si = SLOT_ORDER[i];
        Shadowcraft.Gear.sumSlot(data.gear[si], stats, facets);
      }
      this.statSum = stats;
      return stats;
    };

    ShadowcraftGear.prototype.getStat = function(stat) {
      if (!this.statSum) {
        this.sumStats();
      }
      return this.statSum[stat] || 0;
    };

    getStatWeight = function(stat, num, ignore, ignoreAll) {
      var exist, neg;
      exist = 0;
      if (!ignoreAll) {
        exist = Shadowcraft.Gear.getStat(stat);
        if (ignore && ignore[stat]) {
          exist -= ignore[stat];
        }
      }
      neg = num < 0 ? -1 : 1;
      num = Math.abs(num);
      return (Weights[stat] || 0) * num * neg;
    };

    __epSort = function(a, b) {
      return b.__ep - a.__ep;
    };

    epSort = function(list, skipSort, slot) {
      var item, j, len;
      for (j = 0, len = list.length; j < len; j++) {
        item = list[j];
        if (item) {
          item.__ep = get_ep(item, false, slot);
        }
        if (isNaN(item.__ep)) {
          item.__ep = 0;
        }
      }
      if (!skipSort) {
        return list.sort(__epSort);
      }
    };

    needsDagger = function() {
      return Shadowcraft.Data.activeSpec === "a";
    };

    setBonusEP = function(set, count) {
      var bonus_name, c, p, ref, total;
      if (!(c = Shadowcraft.lastCalculation)) {
        return 0;
      }
      total = 0;
      ref = set.bonuses;
      for (p in ref) {
        bonus_name = ref[p];
        if (count === (p - 1)) {
          total += c["other_ep"][bonus_name];
        }
      }
      return total;
    };

    getEquippedSetCount = function(setIds, ignoreSlotIndex) {
      var _item_id, count, gear, j, len, slot;
      count = 0;
      for (j = 0, len = SLOT_ORDER.length; j < len; j++) {
        slot = SLOT_ORDER[j];
        if (SLOT_INVTYPES[slot] === ignoreSlotIndex) {
          continue;
        }
        gear = Shadowcraft.Data.gear[slot];
        _item_id = gear.upgrade_level ? Math.floor(gear.item_id / 1000000) : gear.item_id;
        if (indexOf.call(setIds, _item_id) >= 0) {
          count++;
        }
      }
      return count;
    };

    isProfessionalGem = function(gem, profession) {
      var ref;
      if (gem == null) {
        return false;
      }
      return (((ref = gem.requires) != null ? ref.profession : void 0) != null) && gem.requires.profession === profession;
    };

    canUseGem = function(gem, gemType, pendingChanges, ignoreSlotIndex) {
      var ref;
      if (((ref = gem.requires) != null ? ref.profession : void 0) != null) {
        if (isProfessionalGem(gem, 'jewelcrafting')) {
          return false;
        }
      }
      if (!gem[gemType]) {
        return false;
      }
      return true;
    };

    equalGemStats = function(from_gem, to_gem) {
      var stat;
      for (stat in from_gem["stats"]) {
        if ((to_gem["stats"][stat] == null) || from_gem["stats"][stat] !== to_gem["stats"][stat]) {
          return false;
        }
      }
      return true;
    };

    getGemmingRecommendation = function(gem_list, item, returnFull, ignoreSlotIndex, offset) {
      var bonus, broke, epValue, gem, gemType, gems, j, len, len1, n, ref, sGems, straightGemEP;
      if (!item.sockets || item.sockets.length === 0) {
        if (returnFull) {
          return {
            ep: 0,
            gems: []
          };
        } else {
          return 0;
        }
      }
      straightGemEP = 0;
      if (returnFull) {
        sGems = [];
      }
      ref = item.sockets;
      for (j = 0, len = ref.length; j < len; j++) {
        gemType = ref[j];
        broke = false;
        for (n = 0, len1 = gem_list.length; n < len1; n++) {
          gem = gem_list[n];
          if (!canUseGem(gem, gemType, sGems, ignoreSlotIndex)) {
            continue;
          }
          if (gem.name.indexOf('Taladite') >= 0 && (item != null) && item.quality === 7 && item.ilvl <= 620) {
            continue;
          }
          if (gem.name.indexOf('Taladite') >= 0 && (item != null) && item.id === 102248 && item.ilvl <= 616) {
            continue;
          }
          straightGemEP += get_ep(gem, false, null, offset);
          if (returnFull) {
            sGems.push(gem.id);
          }
          broke = true;
          break;
        }
        if (!broke && returnFull) {
          sGems.push(null);
        }
      }
      epValue = straightGemEP;
      gems = sGems;
      bonus = returnFull;
      if (returnFull) {
        return {
          ep: epValue,
          takeBonus: bonus,
          gems: gems
        };
      } else {
        return epValue;
      }
    };

    ShadowcraftGear.prototype.lockAll = function() {
      var gear, item, j, len, slot;
      Shadowcraft.Console.log("Locking all items");
      for (j = 0, len = SLOT_ORDER.length; j < len; j++) {
        slot = SLOT_ORDER[j];
        gear = Shadowcraft.Data.gear[slot];
        item = getItem(gear.original_id, gear.item_level, gear.suffix);
        gear.locked = true;
      }
      return Shadowcraft.Gear.updateDisplay();
    };

    ShadowcraftGear.prototype.unlockAll = function() {
      var gear, item, j, len, slot;
      Shadowcraft.Console.log("Unlocking all items");
      for (j = 0, len = SLOT_ORDER.length; j < len; j++) {
        slot = SLOT_ORDER[j];
        gear = Shadowcraft.Data.gear[slot];
        item = getItem(gear.original_id, gear.item_level, gear.suffix);
        gear.locked = false;
      }
      return Shadowcraft.Gear.updateDisplay();
    };

    ShadowcraftGear.prototype.optimizeGems = function(depth) {
      var Gems, data, from_gem, gear, gem, gemIndex, gem_list, gem_offset, item, j, len, len1, madeChanges, n, rec, ref, slotIndex, to_gem;
      Gems = Shadowcraft.ServerData.GEM_LOOKUP;
      data = Shadowcraft.Data;
      depth || (depth = 0);
      if (depth === 0) {
        Shadowcraft.Console.purgeOld();
        EP_PRE_REGEM = this.getEPTotal();
        Shadowcraft.Console.log("Beginning auto-regem...", "gold underline");
      }
      madeChanges = false;
      gem_list = getGemRecommendationList();
      for (j = 0, len = SLOT_ORDER.length; j < len; j++) {
        slotIndex = SLOT_ORDER[j];
        slotIndex = parseInt(slotIndex, 10);
        gear = data.gear[slotIndex];
        if (!gear) {
          continue;
        }
        if (gear.locked) {
          continue;
        }
        item = getItem(gear.original_id, gear.item_level, gear.suffix);
        gem_offset = statOffset(gear, FACETS.GEMS);
        if (item) {
          rec = getGemmingRecommendation(gem_list, item, true, slotIndex, gem_offset);
          ref = rec.gems;
          for (gemIndex = n = 0, len1 = ref.length; n < len1; gemIndex = ++n) {
            gem = ref[gemIndex];
            from_gem = Gems[gear.gems[gemIndex]];
            to_gem = Gems[gem];
            if (to_gem == null) {
              continue;
            }
            if (gear.gems[gemIndex] !== gem) {
              if (from_gem && to_gem) {
                if (from_gem.name === to_gem.name) {
                  continue;
                }
                if (equalGemStats(from_gem, to_gem)) {
                  continue;
                }
                Shadowcraft.Console.log("Regemming " + item.name + " socket " + (gemIndex + 1) + " from " + from_gem.name + " to " + to_gem.name);
              } else {
                Shadowcraft.Console.log("Regemming " + item.name + " socket " + (gemIndex + 1) + " to " + to_gem.name);
              }
              gear.gems[gemIndex] = gem;
              madeChanges = true;
            }
          }
        }
      }
      if (!madeChanges || depth >= 10) {
        this.app.update();
        this.updateDisplay();
        return Shadowcraft.Console.log("Finished automatic regemming: &Delta; " + (Math.floor(this.getEPTotal() - EP_PRE_REGEM)) + " EP", "gold");
      } else {
        return this.optimizeGems(depth + 1);
      }
    };

    getEnchantRecommendation = function(enchant_list, item) {
      var enchant, j, len, ref, ref1;
      for (j = 0, len = enchant_list.length; j < len; j++) {
        enchant = enchant_list[j];
        if (enchant.id === 5125) {
          continue;
        }
        if (enchant.id === 4914) {
          continue;
        }
        if ((((ref = enchant.requires) != null ? ref.max_item_level : void 0) != null) && ((ref1 = enchant.requires) != null ? ref1.max_item_level : void 0) < getBaseItemLevel(item)) {
          continue;
        }
        return enchant.id;
      }
      return false;
    };

    getApplicableEnchants = function(slotIndex, item, enchant_offset) {
      var enchant, enchant_list, enchants, j, len, ref, ref1;
      enchant_list = Shadowcraft.ServerData.ENCHANT_SLOTS[SLOT_INVTYPES[slotIndex]];
      if (enchant_list == null) {
        return [];
      }
      enchants = [];
      for (j = 0, len = enchant_list.length; j < len; j++) {
        enchant = enchant_list[j];
        if ((((ref = enchant.requires) != null ? ref.max_item_level : void 0) != null) && ((ref1 = enchant.requires) != null ? ref1.max_item_level : void 0) < getBaseItemLevel(item)) {
          continue;
        }
        enchant.__ep = get_ep(enchant, null, slotIndex, enchant_offset);
        if (isNaN(enchant.__ep)) {
          enchant.__ep = 0;
        }
        enchants.push(enchant);
      }
      enchants.sort(__epSort);
      return enchants;
    };

    ShadowcraftGear.prototype.getApplicableEnchants = function(slotIndex, item, enchant_offset) {
      return getApplicableEnchants(slotIndex, item, enchant_offset);
    };

    ShadowcraftGear.prototype.optimizeEnchants = function(depth) {
      var Enchants, data, enchantId, enchant_offset, enchants, from_enchant, gear, item, j, len, madeChanges, slotIndex, to_enchant;
      Enchants = Shadowcraft.ServerData.ENCHANT_LOOKUP;
      data = Shadowcraft.Data;
      depth || (depth = 0);
      if (depth === 0) {
        Shadowcraft.Console.purgeOld();
        EP_PRE_REGEM = this.getEPTotal();
        Shadowcraft.Console.log("Beginning auto-enchant...", "gold underline");
      }
      madeChanges = false;
      for (j = 0, len = SLOT_ORDER.length; j < len; j++) {
        slotIndex = SLOT_ORDER[j];
        slotIndex = parseInt(slotIndex, 10);
        gear = data.gear[slotIndex];
        if (!gear) {
          continue;
        }
        if (gear.locked) {
          continue;
        }
        item = getItem(gear.original_id, gear.item_level, gear.suffix);
        if (!item) {
          continue;
        }
        enchant_offset = statOffset(gear, FACETS.ENCHANT);
        enchants = getApplicableEnchants(slotIndex, item, enchant_offset);
        if (item) {
          enchantId = getEnchantRecommendation(enchants, item);
          if (enchantId) {
            from_enchant = Enchants[gear.enchant];
            to_enchant = Enchants[enchantId];
            if (from_enchant && to_enchant) {
              if (from_enchant.id === to_enchant.id) {
                continue;
              }
              Shadowcraft.Console.log("Change enchant of " + item.name + " from " + from_enchant.name + " to " + to_enchant.name);
            } else {
              Shadowcraft.Console.log("Enchant " + item.name + " with " + to_enchant.name);
            }
            gear.enchant = enchantId;
            madeChanges = true;
          }
        }
      }
      if (!madeChanges || depth >= 10) {
        this.app.update();
        this.updateDisplay();
        return Shadowcraft.Console.log("Finished automatic enchanting: &Delta; " + (Math.floor(this.getEPTotal() - EP_PRE_REGEM)) + " EP", "gold");
      } else {
        return this.optimizeEnchants(depth + 1);
      }
    };

    getBestNormalGem = function() {
      var Gems, copy, gem, j, len, list, ref;
      Gems = Shadowcraft.ServerData.GEMS;
      copy = $.extend(true, [], Gems);
      list = [];
      for (j = 0, len = copy.length; j < len; j++) {
        gem = copy[j];
        if ((gem.requires != null) || (((ref = gem.requires) != null ? ref.profession : void 0) != null)) {
          continue;
        }
        gem.__color_ep = gem.__color_ep || get_ep(gem);
        if ((gem["Red"] || gem["Yellow"] || gem["Blue"]) && gem.__color_ep && gem.__color_ep > 1) {
          list.push(gem);
        }
      }
      list.sort(function(a, b) {
        return b.__color_ep - a.__color_ep;
      });
      return list[0];
    };

    getGemRecommendationList = function() {
      var Gems, copy, gem, j, len, list, use_epic_gems;
      Gems = Shadowcraft.ServerData.GEMS;
      copy = $.extend(true, [], Gems);
      list = [];
      use_epic_gems = Shadowcraft.Data.options.general.epic_gems === 1;
      for (j = 0, len = copy.length; j < len; j++) {
        gem = copy[j];
        if (gem.quality === 4 && gem.requires === void 0 && !use_epic_gems) {
          continue;
        }
        gem.normal_ep = get_ep(gem, false, null);
        if (gem.normal_ep && gem.normal_ep > 1) {
          list.push(gem);
        }
      }
      list.sort(function(a, b) {
        return b.normal_ep - a.normal_ep;
      });
      return list;
    };

    ShadowcraftGear.prototype.setGems = function(_gems) {
      var g, gear, gem, gems, i, id, j, len, len1, model, n, ref, s, slot;
      Shadowcraft.Console.purgeOld();
      model = Shadowcraft.Data;
      for (id in _gems) {
        gems = _gems[id];
        gear = null;
        ref = id.split("-"), id = ref[0], s = ref[1];
        id = parseInt(id, 10);
        for (j = 0, len = SLOT_ORDER.length; j < len; j++) {
          slot = SLOT_ORDER[j];
          g = model.gear[slot];
          if (g.item_id === id && slot === s) {
            gear = g;
            break;
          }
        }
        if (gear) {
          for (i = n = 0, len1 = gems.length; n < len1; i = ++n) {
            gem = gems[i];
            if (gem === 0) {
              continue;
            }
            gear.gems[i] = gem;
          }
        }
      }
      Shadowcraft.update();
      return Shadowcraft.Gear.updateDisplay();
    };

    clearBonuses = function() {
      console.log('clear');
    };

    ShadowcraftGear.prototype.applyBonuses = function() {
      var bonus, checkedBonuses, currentBonuses, data, gear, item, j, len, newBonuses, slot, uncheckedBonuses, union;
      Shadowcraft.Console.purgeOld();
      data = Shadowcraft.Data;
      slot = $.data(document.body, "selecting-slot");
      gear = data.gear[slot];
      if (!gear) {
        return;
      }
      item = getItem(gear.item_id, gear.item_level, gear.suffix);
      currentBonuses = [];
      if (gear.bonuses != null) {
        currentBonuses = gear.bonuses;
      }
      checkedBonuses = [];
      uncheckedBonuses = [];
      $("#bonuses input:checkbox").each(function() {
        var val;
        val = parseInt($(this).val(), 10);
        if ($(this).is(':checked')) {
          return checkedBonuses.push(val);
        } else {
          return uncheckedBonuses.push(val);
        }
      });
      $("#bonuses select option").each(function() {
        var val;
        val = parseInt($(this).val(), 10);
        if ($(this).is(':selected')) {
          return checkedBonuses.push(val);
        } else {
          return uncheckedBonuses.push(val);
        }
      });
      union = _.union(currentBonuses, checkedBonuses);
      newBonuses = _.difference(union, uncheckedBonuses);
      for (j = 0, len = currentBonuses.length; j < len; j++) {
        bonus = currentBonuses[j];
        if (indexOf.call(uncheckedBonuses, bonus) >= 0) {
          applyBonusToItem(item, bonus, slot, false);
        }
      }
      gear.bonuses = newBonuses;
      $("#bonuses").removeClass("visible");
      Shadowcraft.update();
      return Shadowcraft.Gear.updateDisplay();
    };

    applyBonusToItem = function(item, bonusId, slot, apply) {
      var base, bonus_entry, j, last, len, name1, ref, results, value;
      if (apply == null) {
        apply = true;
      }
      ref = Shadowcraft.ServerData.ITEM_BONUSES[bonusId];
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        bonus_entry = ref[j];
        switch (bonus_entry.type) {
          case 6:
            if (apply) {
              last = item.sockets[item.sockets.length - 1];
              results.push(item.sockets.push("Prismatic"));
            } else {
              results.push(item.sockets.pop());
            }
            break;
          case 5:
            if (apply) {
              results.push(item.name_suffix = bonus_entry.val1);
            } else {
              results.push(item.name_suffix = "");
            }
            break;
          case 2:
            value = Math.round(bonus_entry.val2 / 10000 * Shadowcraft.ServerData.RAND_PROP_POINTS[item.ilvl][1 + getRandPropRow(slot)]);
            (base = item.stats)[name1 = bonus_entry.val1] || (base[name1] = 0);
            if (apply) {
              results.push(item.stats[bonus_entry.val1] = value);
            } else {
              results.push(item.stats[bonus_entry.val1] -= value);
            }
            break;
          default:
            results.push(void 0);
        }
      }
      return results;
    };


    /*
     * View helpers
     */

    ShadowcraftGear.prototype.updateDisplay = function(skipUpdate) {
      var EnchantLookup, EnchantSlots, Gems, allSlotsMatch, amt, base, bonus, bonusId, bonus_entry, bonus_keys, bonusable, bonuses, bonuses_equipped, buffer, curr_level, data, enchant, enchantable, gear, gem, gems, i, index, item, j, last, len, len1, len2, len3, len4, len5, max_level, n, o, opt, q, ref, ref1, ref2, ref3, ref4, ref5, slotIndex, slotSet, socket, socketIndex, ssi, stat, u, upgradable, upgrade, w, z;
      EnchantLookup = Shadowcraft.ServerData.ENCHANT_LOOKUP;
      EnchantSlots = Shadowcraft.ServerData.ENCHANT_SLOTS;
      Gems = Shadowcraft.ServerData.GEM_LOOKUP;
      data = Shadowcraft.Data;
      opt = {};
      for (ssi = j = 0, len = SLOT_DISPLAY_ORDER.length; j < len; ssi = ++j) {
        slotSet = SLOT_DISPLAY_ORDER[ssi];
        buffer = "";
        for (slotIndex = n = 0, len1 = slotSet.length; n < len1; slotIndex = ++n) {
          i = slotSet[slotIndex];
          (base = data.gear)[i] || (base[i] = {});
          gear = data.gear[i];
          item = getItem(gear.original_id, gear.item_level, gear.suffix);
          gems = [];
          bonuses = null;
          enchant = EnchantLookup[gear.enchant];
          enchantable = null;
          upgradable = null;
          bonusable = null;
          if (item) {
            item.sockets || (item.sockets = []);
            enchantable = (EnchantSlots[item.equip_location] != null) && getApplicableEnchants(i, item).length > 0;
            bonus_keys = _.keys(Shadowcraft.ServerData.ITEM_BONUSES);
            bonuses_equipped = [];
            if (item.sockets && item.sockets.length > 0) {
              for (socketIndex = o = ref = item.sockets.length - 1; ref <= 0 ? o <= 0 : o >= 0; socketIndex = ref <= 0 ? ++o : --o) {
                last = item.sockets[socketIndex];
                if (last === "Prismatic") {
                  item.sockets.pop();
                }
              }
            }
            if (gear.bonuses != null) {
              ref1 = gear.bonuses;
              for (q = 0, len2 = ref1.length; q < len2; q++) {
                bonus = ref1[q];
                bonuses_equipped.push(bonus);
                if (_.contains(bonus_keys, bonus + "")) {
                  applyBonusToItem(item, bonus, i);
                }
              }
            }
            if (item.chance_bonus_lists != null) {
              ref2 = item.chance_bonus_lists;
              for (u = 0, len3 = ref2.length; u < len3; u++) {
                bonusId = ref2[u];
                if (bonusId == null) {
                  continue;
                }
                if (bonusable) {
                  break;
                }
                ref3 = Shadowcraft.ServerData.ITEM_BONUSES[bonusId];
                for (w = 0, len4 = ref3.length; w < len4; w++) {
                  bonus_entry = ref3[w];
                  switch (bonus_entry.type) {
                    case 6:
                      bonusable = true;
                      break;
                    case 2:
                      bonusable = true;
                      break;
                  }
                }
              }
            }
            allSlotsMatch = item.sockets && item.sockets.length > 0;
            ref4 = item.sockets;
            for (index = z = 0, len5 = ref4.length; z < len5; index = ++z) {
              socket = ref4[index];
              gem = Gems[gear.gems[index]];
              gems[gems.length] = {
                socket: socket,
                gem: gem
              };
              if (socket === "Prismatic") {
                continue;
              }
              if (!gem || !gem[socket]) {
                allSlotsMatch = false;
              }
            }
            if (allSlotsMatch) {
              bonuses = [];
              ref5 = item.socketbonus;
              for (stat in ref5) {
                amt = ref5[stat];
                bonuses[bonuses.length] = {
                  stat: titleize(stat),
                  amount: amt
                };
              }
            }
            if (enchant && !enchant.desc) {
              enchant.desc = statsToDesc(enchant);
            }
            if (item.upgradable) {
              curr_level = "0";
              if (gear.upgrade_level != null) {
                curr_level = gear.upgrade_level.toString();
              }
              max_level = getMaxUpgradeLevel(item);
              upgrade = {
                curr_level: curr_level,
                max_level: max_level
              };
            }
          }
          if (enchant && enchant.desc === "") {
            enchant.desc = enchant.name;
          }
          opt = {};
          opt.item = item;
          if (item) {
            opt.identifier = item.original_id + ":" + item.ilvl + ":" + (item.suffix || 0);
          }
          if (item) {
            opt.ttid = item.original_id;
          }
          opt.ttrand = item ? item.suffix : null;
          opt.ttupgd = item ? item.upgrade_level : null;
          opt.ttbonus = bonuses_equipped ? bonuses_equipped.join(":") : null;
          opt.ep = item ? get_ep(item, null, i).toFixed(1) : 0;
          opt.slot = i + '';
          opt.gems = gems;
          opt.socketbonus = bonuses;
          opt.bonusable = true;
          opt.sockets = item ? item.sockets : null;
          opt.enchantable = enchantable;
          opt.enchant = enchant;
          opt.upgradable = item ? item.upgradable : false;
          opt.upgrade = upgrade;
          opt.bonusable = bonusable;
          if (item) {
            opt.lock = true;
            if (gear.locked) {
              opt.lock_class = "lock_on";
            } else {
              opt.lock_class = "lock_off";
            }
          }
          buffer += Templates.itemSlot(opt);
        }
        $slots.get(ssi).innerHTML = buffer;
      }
      this.updateStatsWindow();
      this.updateSummaryWindow();
      return checkForWarnings('gear');
    };

    ShadowcraftGear.prototype.getEPTotal = function() {
      var idx, keys, stat, total, weight;
      this.sumStats();
      keys = _.keys(this.statSum).sort();
      total = 0;
      for (idx in keys) {
        stat = keys[idx];
        weight = getStatWeight(stat, this.statSum[stat], null, true);
        total += weight;
      }
      return total;
    };

    ShadowcraftGear.prototype.updateSummaryWindow = function() {
      var $summary, a_stats, data, valengine;
      data = Shadowcraft.Data;
      $summary = $("#summary .inner");
      a_stats = [];
      if (data.options.general.patch) {
        if (data.options.general.patch === 60) {
          valengine = "6.2";
        } else {
          valengine = data.options.general.patch / 10;
        }
      } else {
        valengine = "6.x";
      }
      valengine += " " + (data.options.general.pvp ? "(PvP)" : "(PvE)");
      a_stats.push({
        name: "Engine",
        val: valengine
      });
      a_stats.push({
        name: "Spec",
        val: ShadowcraftTalents.GetActiveSpecName() || "n/a"
      });
      a_stats.push({
        name: "Boss Adds",
        val: (data.options.general.num_boss_adds != null) && (data.options.general.num_boss_adds > 0) ? Math.min(4, data.options.general.num_boss_adds) : "0"
      });
      if (ShadowcraftTalents.GetActiveSpecName() === "Combat") {
        a_stats.push({
          name: "Blade Flurry",
          val: data.options.rotation.blade_flurry ? "ON" : "OFF"
        });
      } else if (ShadowcraftTalents.GetActiveSpecName() === "Subtlety") {
        a_stats.push({
          name: "CP Builder",
          val: (function() {
            switch (data.options.rotation.use_hemorrhage) {
              case "never":
                return "Backstab";
              case "always":
                return "Hemorrhage";
              case "uptime":
                return "Backstab w/ Hemo";
            }
          })()
        });
      }
      if (data.options.general.lethal_poison) {
        a_stats.push({
          name: "Poison",
          val: (function() {
            switch (data.options.general.lethal_poison) {
              case "wp":
                return "Wound";
              case "dp":
                return "Deadly";
            }
          })()
        });
      }
      return $summary.get(0).innerHTML = Templates.stats({
        stats: a_stats
      });
    };

    ShadowcraftGear.prototype.updateStatsWindow = function() {
      var $stats, a_stats, idx, keys, stat, total, weight;
      this.sumStats();
      $stats = $("#stats .inner");
      a_stats = [];
      keys = _.keys(this.statSum).sort();
      total = 0;
      for (idx in keys) {
        stat = keys[idx];
        weight = getStatWeight(stat, this.statSum[stat], null, true);
        total += weight;
        a_stats.push({
          name: titleize(stat),
          val: this.statSum[stat]
        });
      }
      EP_TOTAL = total;
      return $stats.get(0).innerHTML = Templates.stats({
        stats: a_stats
      });
    };

    updateStatWeights = function(source) {
      var $weights, all, exist, key, other, weight;
      Weights.agility = source.ep.agi;
      Weights.crit = source.ep.crit;
      Weights.strength = source.ep.str;
      Weights.mastery = source.ep.mastery;
      Weights.haste = source.ep.haste;
      Weights.multistrike = source.ep.multistrike;
      Weights.versatility = source.ep.versatility;
      Weights.pvp_power = source.ep.pvp_power || 0;
      other = {
        mainhand_dps: Shadowcraft.lastCalculation.mh_ep.mh_dps,
        offhand_dps: Shadowcraft.lastCalculation.oh_ep.oh_dps,
        t17_2pc: source.other_ep.rogue_t17_2pc || 0,
        t17_4pc: source.other_ep.rogue_t17_4pc || 0,
        t17_4pc_lfr: source.other_ep.rogue_t17_4pc_lfr || 0,
        t18_2pc: source.other_ep.rogue_t18_2pc || 0,
        t18_4pc: source.other_ep.rogue_t18_4pc || 0,
        t18_4pc_lfr: source.other_ep.rogue_t18_4pc_lfr || 0
      };
      all = _.extend(Weights, other);
      $weights = $("#weights .inner");
      $weights.empty();
      for (key in all) {
        weight = all[key];
        if (isNaN(weight)) {
          continue;
        }
        if (weight === 0) {
          continue;
        }
        exist = $(".stat#weight_" + key);
        if (exist.length > 0) {
          exist.find("val").text(weight.toFixed(3));
        } else {
          $weights.append("<div class='stat' id='weight_" + key + "'><span class='key'>" + (titleize(key)) + "</span><span class='val'>" + (Weights[key].toFixed(3)) + "</span></div>");
          exist = $(".stat#weight_" + key);
          $.data(exist.get(0), "sortkey", 0);
          if (key === "mainhand_dps" || key === "offhand_dps") {
            $.data(exist.get(0), "sortkey", 1);
          } else if (key === "t17_2pc" || key === "t17_4pc" || key === "t17_4pc_lfr" || key === "t18_2pc" || key === "t18_4pc" || key === "t18_4pc_lfr") {
            $.data(exist.get(0), "sortkey", 2);
          }
        }
        $.data(exist.get(0), "weight", weight);
      }
      $("#weights .stat").sortElements(function(a, b) {
        var as, bs;
        as = $.data(a, "sortkey");
        bs = $.data(b, "sortkey");
        if (as !== bs) {
          if (as > bs) {
            return 1;
          } else {
            return -1;
          }
        } else {
          if ($.data(a, "weight") > $.data(b, "weight")) {
            return -1;
          } else {
            return 1;
          }
        }
      });
      return epSort(Shadowcraft.ServerData.GEMS);
    };

    statsToDesc = function(obj) {
      var buff, stat;
      if (obj.__statsToDesc) {
        return obj.__statsToDesc;
      }
      buff = [];
      for (stat in obj.stats) {
        buff[buff.length] = "+" + obj.stats[stat] + " " + titleize(stat);
      }
      obj.__statsToDesc = buff.join("/");
      return obj.__statsToDesc;
    };

    updateEngineInfoWindow = function() {
      var $summary, data, engine_info, name, val;
      if (Shadowcraft.lastCalculation.engine_info == null) {
        return;
      }
      engine_info = Shadowcraft.lastCalculation.engine_info;
      $summary = $("#engineinfo .inner");
      data = [];
      for (name in engine_info) {
        val = engine_info[name];
        data.push({
          name: titleize(name),
          val: val
        });
      }
      return $summary.get(0).innerHTML = Templates.stats({
        stats: data
      });
    };

    updateDpsBreakdown = function() {
      var buffer, dps_breakdown, exist, max, name, pct, pct_dps, rankings, skill, target, total_dps, val;
      dps_breakdown = Shadowcraft.lastCalculation.breakdown;
      total_dps = Shadowcraft.lastCalculation.total_dps;
      max = null;
      buffer = "";
      target = $("#dpsbreakdown .inner");
      rankings = _.extend({}, dps_breakdown);
      max = _.max(rankings);
      $("#dpsbreakdown .talent_contribution").hide();
      for (skill in dps_breakdown) {
        val = dps_breakdown[skill];
        skill = skill.replace('(', '').replace(')', '').split(' ').join('_');
        val = parseFloat(val);
        name = titleize(skill);
        skill = skill.replace(/\./g, '_');
        exist = $("#dpsbreakdown #talent-weight-" + skill);
        if (isNaN(val)) {
          name += " (NYI)";
          val = 0;
        }
        pct = val / max * 100 + 0.01;
        pct_dps = val / total_dps * 100;
        if (exist.length === 0) {
          buffer = Templates.talentContribution({
            name: name + " (" + (val.toFixed(1)) + " DPS)",
            raw_name: skill,
            val: val.toFixed(1),
            width: pct
          });
          target.append(buffer);
        }
        exist = $("#dpsbreakdown #talent-weight-" + skill);
        $.data(exist.get(0), "val", val);
        exist.show().find(".pct-inner").css({
          width: pct + "%"
        });
        exist.find(".label").text(pct_dps.toFixed(2) + "%");
      }
      return $("#dpsbreakdown .talent_contribution").sortElements(function(a, b) {
        var ad, bd;
        ad = $.data(a, "val");
        bd = $.data(b, "val");
        if (ad > bd) {
          return -1;
        } else {
          return 1;
        }
      });
    };

    clickSlot = function(slot, prop) {
      var $slot, slotIndex;
      $slot = $(slot).closest(".slot");
      $slots.find(".slot").removeClass("active");
      $slot.addClass("active");
      slotIndex = parseInt($slot.attr("data-slot"), 10);
      $.data(document.body, "selecting-slot", slotIndex);
      $.data(document.body, "selecting-prop", prop);
      return [$slot, slotIndex];
    };

    getItem = function(itemId, itemLevel, suffix) {
      var arm, item, itemString;
      arm = [itemId, itemLevel, suffix || 0];
      itemString = arm.join(':');
      item = Shadowcraft.ServerData.ITEM_LOOKUP2[itemString];
      if ((item == null) && itemId) {
        console.warn("item not found", itemString);
      }
      return item;
    };

    ShadowcraftGear.prototype.getItem = function(itemId, itemLevel, suffix) {
      return getItem(itemId, itemLevel, suffix);
    };

    getItems = function(filter) {
      if (filter == null) {
        filter = {};
      }
      return _.where(Shadowcraft.ServerData.ITEM_LOOKUP2, filter);
    };

    getMaxUpgradeLevel = function(item) {
      return 2;
    };

    getUpgradeLevelSteps = function(item) {
      return 5;
    };

    clickSlotName = function() {
      var $slot, GemList, bonus_trees, buf, buffer, combatSpec, curr_level, equip_location, gear, gear_offset, gem_offset, iEP, j, l, len, len1, len2, len3, lid, loc, loc_all, maxIEP, max_level, minIEP, n, o, q, ref, requireDagger, selected_identifier, set, setBonEP, setCount, set_name, slot, subtletyNeedsDagger, ttbonus, ttid, ttrand, ttupgd, upgrade;
      buf = clickSlot(this, "item_id");
      $slot = buf[0];
      slot = buf[1];
      selected_identifier = $slot.data("identifier");
      equip_location = SLOT_INVTYPES[slot];
      GemList = Shadowcraft.ServerData.GEMS;
      gear = Shadowcraft.Data.gear;
      requireDagger = needsDagger();
      combatSpec = Shadowcraft.Data.activeSpec === "Z";
      subtletyNeedsDagger = Shadowcraft.Data.activeSpec === "b" && ((ref = Shadowcraft.Data.options.rotation.use_hemorrhage) === 'uptime' || ref === 'never');
      loc_all = Shadowcraft.ServerData.SLOT_CHOICES[equip_location];
      loc = [];
      for (j = 0, len = loc_all.length; j < len; j++) {
        lid = loc_all[j];
        l = ShadowcraftData.ITEM_LOOKUP2[lid];
        if (lid === selected_identifier) {
          loc.push(l);
          continue;
        }
        if (l.ilvl > Shadowcraft.Data.options.general.max_ilvl) {
          continue;
        }
        if (l.ilvl < Shadowcraft.Data.options.general.min_ilvl) {
          continue;
        }
        if ((slot === 15 || slot === 16) && requireDagger && l.subclass !== 15) {
          continue;
        }
        if ((slot === 15) && subtletyNeedsDagger && l.subclass !== 15) {
          continue;
        }
        if (l.upgrade_level !== 0 && Shadowcraft.Data.options.general.show_upgrades === 0 && lid !== selected_identifier) {
          continue;
        }
        if (l.upgrade_level !== 0 && l.upgrade_level > getMaxUpgradeLevel(l)) {
          continue;
        }
        if (l.suffix && Shadowcraft.Data.options.general.show_random_items > l.ilvl && lid !== selected_identifier) {
          continue;
        }
        if ((l.tag != null) && /Tournament$/.test(l.tag) && !Shadowcraft.Data.options.general.pvp) {
          continue;
        }
        loc.push(l);
      }
      gear_offset = statOffset(gear[slot], FACETS.ITEM);
      gem_offset = statOffset(gear[slot], FACETS.GEMS);
      epSort(GemList);
      setBonEP = {};
      for (set_name in Sets) {
        set = Sets[set_name];
        setCount = getEquippedSetCount(set.ids, equip_location);
        setBonEP[set_name] || (setBonEP[set_name] = 0);
        setBonEP[set_name] += setBonusEP(set, setCount);
      }
      for (n = 0, len1 = loc.length; n < len1; n++) {
        l = loc[n];
        l.sockets || (l.sockets = []);
        l.__gemRec = getGemmingRecommendation(GemList, l, true, slot, gem_offset);
        l.__setBonusEP = 0;
        for (set_name in Sets) {
          set = Sets[set_name];
          if (set.ids.indexOf(l.original_id) >= 0) {
            l.__setBonusEP += setBonEP[set_name];
          }
        }
        l.__gearEP = get_ep(l, null, slot, gear_offset);
        if (isNaN(l.__gearEP)) {
          l.__gearEP = 0;
        }
        if (isNaN(l.__setBonusEP)) {
          l.__setBonusEP = 0;
        }
        l.__ep = l.__gearEP + l.__gemRec.ep + l.__setBonusEP;
      }
      loc.sort(__epSort);
      maxIEP = 1;
      minIEP = 0;
      buffer = "";
      for (o = 0, len2 = loc.length; o < len2; o++) {
        l = loc[o];
        if (l.__ep < 1) {
          continue;
        }
        if (!isNaN(l.__ep)) {
          if (maxIEP <= 1) {
            maxIEP = l.__ep;
          }
          minIEP = l.__ep;
        }
      }
      maxIEP -= minIEP;
      for (q = 0, len3 = loc.length; q < len3; q++) {
        l = loc[q];
        if (l.__ep < 1) {
          continue;
        }
        iEP = l.__ep;
        ttid = l.original_id;
        ttrand = l.suffix != null ? l.suffix : "";
        ttupgd = l.upgradable ? l.upgrade_level : "";
        ttbonus = l.bonus_tree != null ? l.bonus_tree.join(":") : "";
        if (l.identifier === selected_identifier) {
          bonus_trees = gear[slot].bonuses;
          ttbonus = bonus_trees.join(":");
        }
        upgrade = [];
        if (l.upgradable) {
          curr_level = "0";
          if (l.upgrade_level != null) {
            curr_level = l.upgrade_level.toString();
          }
          max_level = getMaxUpgradeLevel(l);
          upgrade = {
            curr_level: curr_level,
            max_level: max_level
          };
        }
        buffer += Templates.itemSlot({
          item: l,
          identifier: l.original_id + ":" + l.ilvl + ":" + (l.suffix || 0),
          gear: {},
          gems: [],
          upgradable: l.upgradable,
          upgrade: upgrade,
          ttid: ttid,
          ttrand: ttrand,
          ttupgd: ttupgd,
          ttbonus: ttbonus,
          desc: (l.__gearEP.toFixed(1)) + " base / " + (l.__gemRec.ep.toFixed(1)) + " gem " + (l.__setBonusEP > 0 ? "/ " + l.__setBonusEP.toFixed(1) + " set" : "") + " ",
          search: escape(l.name + " " + l.tag),
          percent: Math.max((iEP - minIEP) / maxIEP * 100, 0.01),
          ep: iEP.toFixed(1)
        });
      }
      buffer += Templates.itemSlot({
        item: {
          name: "[No item]"
        },
        desc: "Clear this slot",
        percent: 0,
        ep: 0
      });
      $altslots.get(0).innerHTML = buffer;
      $altslots.find(".slot[data-identifier='" + selected_identifier + "']").addClass("active");
      showPopup($popup);
      return false;
    };

    clickSlotEnchant = function() {
      var EnchantSlots, buf, buffer, data, eEP, enchant, enchants, equip_location, gear, item, j, len, len1, max, n, offset, ref, ref1, selected_id, slot;
      data = Shadowcraft.Data;
      EnchantSlots = Shadowcraft.ServerData.ENCHANT_SLOTS;
      buf = clickSlot(this, "enchant");
      slot = buf[1];
      equip_location = SLOT_INVTYPES[slot];
      enchants = EnchantSlots[equip_location];
      max = 0;
      gear = Shadowcraft.Data.gear[slot];
      offset = statOffset(gear, FACETS.ENCHANT);
      item = getItem(gear.original_id, gear.item_level, gear.suffix);
      for (j = 0, len = enchants.length; j < len; j++) {
        enchant = enchants[j];
        enchant.__ep = get_ep(enchant, null, slot, offset);
        if (isNaN(enchant.__ep)) {
          enchant.__ep = 0;
        }
        max = enchant.__ep > max ? enchant.__ep : max;
      }
      enchants.sort(__epSort);
      selected_id = data.gear[slot].enchant;
      buffer = "";
      for (n = 0, len1 = enchants.length; n < len1; n++) {
        enchant = enchants[n];
        if ((((ref = enchant.requires) != null ? ref.max_item_level : void 0) != null) && ((ref1 = enchant.requires) != null ? ref1.max_item_level : void 0) < getBaseItemLevel(item)) {
          continue;
        }
        if (enchant && !enchant.desc) {
          enchant.desc = statsToDesc(enchant);
        }
        if (enchant && enchant.desc === "") {
          enchant.desc = enchant.name;
        }
        eEP = enchant.__ep;
        if (eEP < 1) {
          continue;
        }
        buffer += Templates.itemSlot({
          item: enchant,
          percent: eEP / max * 100,
          ep: eEP.toFixed(1),
          search: escape(enchant.name + " " + enchant.desc),
          desc: enchant.desc
        });
      }
      buffer += Templates.itemSlot({
        item: {
          name: "[No enchant]"
        },
        desc: "Clear this enchant",
        percent: 0,
        ep: 0
      });
      $altslots.get(0).innerHTML = buffer;
      $altslots.find(".slot[id='" + selected_id + "']").addClass("active");
      showPopup($popup);
      return false;
    };

    getBaseItemLevel = function(item) {
      if (!item.upgrade_level) {
        return item.ilvl;
      }
      return item.ilvl - getUpgradeLevelSteps(item) * item.upgrade_level;
    };

    clickSlotGem = function() {
      var $slot, GemList, ItemLookup, buf, buffer, data, desc, gEP, gem, gemSlot, gemType, i, item, j, len, len1, max, n, o, otherGearGems, ref, selected_id, slot, usedNames;
      ItemLookup = Shadowcraft.ServerData.ITEM_LOOKUP2;
      GemList = Shadowcraft.ServerData.GEMS;
      data = Shadowcraft.Data;
      buf = clickSlot(this, "gem");
      $slot = buf[0];
      slot = buf[1];
      item = ItemLookup[$slot.data("identifier")];
      gemSlot = $slot.find(".gem").index(this);
      $.data(document.body, "gem-slot", gemSlot);
      gemType = item.sockets[gemSlot];
      selected_id = data.gear[slot].gems[gemSlot];
      otherGearGems = [];
      for (i = j = 0; j <= 2; i = ++j) {
        if (i === gemSlot) {
          continue;
        }
        if (data.gear[slot].gems[i]) {
          otherGearGems.push(data.gear[slot].gems[i]);
        }
      }
      for (n = 0, len = GemList.length; n < len; n++) {
        gem = GemList[n];
        gem.__ep = get_ep(gem);
      }
      GemList.sort(__epSort);
      buffer = "";
      usedNames = {};
      max = null;
      for (o = 0, len1 = GemList.length; o < len1; o++) {
        gem = GemList[o];
        if (usedNames[gem.name]) {
          if (gem.id === selected_id) {
            selected_id = usedNames[gem.name];
          }
          continue;
        }
        usedNames[gem.name] = gem.id;
        if (gem.name.indexOf("Perfect") === 0 && selected_id !== gem.id) {
          continue;
        }
        if (!canUseGem(gem, gemType, otherGearGems, slot)) {
          continue;
        }
        if (gem.name.indexOf('Taladite') >= 0 && (item != null) && item.quality === 7 && item.ilvl <= 620) {
          continue;
        }
        if (gem.name.indexOf('Taladite') >= 0 && (item != null) && ((ref = item.id) === 98148 || ref === 102248) && item.ilvl <= 616) {
          continue;
        }
        max || (max = gem.__ep);
        gEP = gem.__ep;
        desc = statsToDesc(gem);
        if (gEP < 1) {
          continue;
        }
        buffer += Templates.itemSlot({
          item: gem,
          ep: gEP.toFixed(1),
          gear: {},
          ttid: gem.id,
          search: escape(gem.name + " " + statsToDesc(gem) + " " + gem.slot),
          percent: gEP / max * 100,
          desc: desc
        });
      }
      buffer += Templates.itemSlot({
        item: {
          name: "[No gem]"
        },
        desc: "Clear this gem",
        percent: 0,
        ep: 0
      });
      $altslots.get(0).innerHTML = buffer;
      $altslots.find(".slot[id='" + selected_id + "']").addClass("active");
      showPopup($popup);
      return false;
    };

    clickSlotBonuses = function() {
      var $slot, bonusId, bonus_entry, currentBonuses, data, entry, gear, gem, group, groups, identifier, item, j, key, len, len1, n, ref, ref1, slot, subgroup;
      clickSlot(this, "bonuses");
      $(".slot").removeClass("active");
      $(this).addClass("active");
      data = Shadowcraft.Data;
      $slot = $(this).closest(".slot");
      slot = parseInt($slot.data("slot"), 10);
      $.data(document.body, "selecting-slot", slot);
      identifier = $slot.data("identifier");
      item = Shadowcraft.ServerData.ITEM_LOOKUP2[identifier];
      gear = data.gear[slot];
      currentBonuses = gear.bonuses;
      groups = {
        suffixes: [],
        tertiary: [],
        sockets: []
      };
      ref = item.chance_bonus_lists;
      for (j = 0, len = ref.length; j < len; j++) {
        bonusId = ref[j];
        group = {};
        group['bonusId'] = bonusId;
        if (_.contains(currentBonuses, bonusId)) {
          group['active'] = true;
        }
        group['entries'] = [];
        group.ep = 0;
        subgroup = null;
        ref1 = Shadowcraft.ServerData.ITEM_BONUSES[bonusId];
        for (n = 0, len1 = ref1.length; n < len1; n++) {
          bonus_entry = ref1[n];
          entry = {
            'type': bonus_entry.type,
            'val1': bonus_entry.val1,
            'val2': bonus_entry.val2
          };
          switch (bonus_entry.type) {
            case 6:
              group['entries'].push(entry);
              gem = getBestNormalGem;
              group.ep += get_ep(gem);
              subgroup = "sockets";
              break;
            case 5:
              group['entries'].push(entry);
              subgroup = "suffixes";
              break;
            case 2:
              entry['val2'] = Math.round(bonus_entry.val2 / 10000 * Shadowcraft.ServerData.RAND_PROP_POINTS[item.ilvl][1 + getRandPropRow(slot)]);
              entry['val1'] = bonus_entry.val1;
              group['entries'].push(entry);
              group.ep += getStatWeight(entry.val1, entry.val2);
              if (subgroup == null) {
                subgroup = "tertiary";
              }
          }
        }
        if (subgroup != null) {
          group.ep = group.ep.toFixed(2);
          groups[subgroup].push(group);
          groups[subgroup + "_active"] = true;
        }
      }
      for (key in groups) {
        subgroup = groups[key];
        if (!_.isArray(subgroup)) {
          continue;
        }
        subgroup.sort(function(a, b) {
          return b.ep - a.ep;
        });
      }
      $.data(document.body, "bonuses-item", item);
      $("#bonuses").html(Templates.bonuses({
        groups: groups
      }));
      Shadowcraft.setupLabels("#bonuses");
      showPopup($("#bonuses.popup"));
      return false;
    };

    clickWowhead = function(e) {
      e.stopPropagation();
      return true;
    };

    clickItemUpgrade = function(e) {
      var buf, data, gear, item, max, new_item_id, slot;
      e.stopPropagation();
      buf = clickSlot(this, "item_id");
      slot = buf[1];
      data = Shadowcraft.Data;
      gear = data.gear[slot];
      item = getItem(gear.original_id, gear.item_level, gear.suffix);
      new_item_id = gear.item_id;
      if (gear.upgrade_level) {
        new_item_id = Math.floor(new_item_id / 1000000);
        max = getMaxUpgradeLevel(item);
        gear.upgrade_level += 1;
        gear.item_level += getUpgradeLevelSteps(item);
        if (gear.upgrade_level > max) {
          gear.item_level -= getUpgradeLevelSteps(item) * gear.upgrade_level;
          delete gear.upgrade_level;
        }
      } else {
        if (item.suffix) {
          new_item_id = Math.floor(new_item_id / 1000);
        }
        gear.upgrade_level = 1;
        gear.item_level += getUpgradeLevelSteps(item);
      }
      if (gear.upgrade_level) {
        new_item_id = new_item_id * 1000000 + gear.upgrade_level;
        if (item.suffix) {
          new_item_id += Math.abs(item.suffix) * 1000;
        }
      } else if (item.suffix) {
        new_item_id = new_item_id * 1000 + Math.abs(item.suffix);
      }
      data.gear[slot].item_id = new_item_id;
      Shadowcraft.update();
      Shadowcraft.Gear.updateDisplay();
      return true;
    };

    clickItemLock = function(e) {
      var buf, data, gear, item, slot;
      e.stopPropagation();
      buf = clickSlot(this, "item_id");
      slot = buf[1];
      data = Shadowcraft.Data;
      gear = data.gear[slot];
      gear.locked || (gear.locked = false);
      data.gear[slot].locked = !gear.locked;
      item = getItem(gear.original_id, gear.item_level, gear.suffix);
      if (item) {
        if (data.gear[slot].locked) {
          Shadowcraft.Console.log("Locking " + item.name + " for Optimize Gems");
        } else {
          Shadowcraft.Console.log("Unlocking " + item.name + " for Optimize Gems");
        }
      }
      Shadowcraft.Gear.updateDisplay();
      return true;
    };

    ShadowcraftGear.prototype.boot = function() {
      var app, defaultScale, reset;
      app = this;
      $slots = $(".slots");
      $popup = $(".alternatives");
      $altslots = $(".alternatives .body");
      Shadowcraft.Backend.bind("recompute", updateStatWeights);
      Shadowcraft.Backend.bind("recompute", function() {
        return Shadowcraft.Gear;
      });
      Shadowcraft.Backend.bind("recompute", updateDpsBreakdown);
      Shadowcraft.Backend.bind("recompute", updateEngineInfoWindow);
      Shadowcraft.Talents.bind("changed", function() {
        app.updateStatsWindow();
        return app.updateSummaryWindow();
      });
      Shadowcraft.bind("loadData", function() {
        return app.updateDisplay();
      });
      $("#optimizeGems").click(function() {
        if (window._gaq) {
          window._gaq.push(['_trackEvent', "Character", "Optimize Gems"]);
        }
        return Shadowcraft.Gear.optimizeGems();
      });
      $("#optimizeEnchants").click(function() {
        if (window._gaq) {
          window._gaq.push(['_trackEvent', "Character", "Optimize Enchants"]);
        }
        return Shadowcraft.Gear.optimizeEnchants();
      });
      $("#lockAll").click(function() {
        if (window._gaq) {
          window._gaq.push(['_trackEvent', "Character", "Lock All"]);
        }
        return Shadowcraft.Gear.lockAll();
      });
      $("#unlockAll").click(function() {
        if (window._gaq) {
          window._gaq.push(['_trackEvent', "Character", "Unlock All"]);
        }
        return Shadowcraft.Gear.unlockAll();
      });
      $("#bonuses").click($.delegate({
        ".label_check input": function() {
          var $this;
          $this = $(this);
          $this.attr("checked", $this.attr("checked") == null);
          return Shadowcraft.setupLabels("#bonuses");
        },
        ".applyBonuses": this.applyBonuses,
        ".clearBonuses": clearBonuses
      }));
      $slots.click($.delegate({
        ".upgrade": clickItemUpgrade,
        ".lock": clickItemLock,
        ".wowhead": clickWowhead,
        ".name": clickSlotName,
        ".enchant": clickSlotEnchant,
        ".gem": clickSlotGem,
        ".bonuses": clickSlotBonuses
      }));
      $(".slots, .popup").mouseover($.delegate({
        ".tt": ttlib.requestTooltip
      })).mouseout($.delegate({
        ".tt": ttlib.hide
      }));
      $(".popup .body").bind("mousewheel", function(event) {
        if ((event.wheelDelta < 0 && this.scrollTop + this.clientHeight >= this.scrollHeight) || event.wheelDelta > 0 && this.scrollTop === 0) {
          event.preventDefault();
          return false;
        }
      });
      $("#gear .slots").mousemove(function(e) {
        $.data(document, "mouse-x", e.pageX);
        return $.data(document, "mouse-y", e.pageY);
      });
      defaultScale = {
        Intellect: -1000000,
        Spirit: -1000000,
        Is2HMace: -1000000,
        IsPolearm: -1000000,
        Is2HSword: -1000000,
        IsShield: -1000000,
        SpellPower: -1000000,
        IsStaff: -1000000,
        IsFrill: -1000000,
        IsCloth: -1000000,
        IsMail: -1000000,
        IsPlate: -1000000,
        IsRelic: -1000000,
        Ap: 1,
        IsWand: -1000000,
        SpellPenetration: -1000000,
        GemQualityLevel: 85,
        MetaGemQualityLevel: 86,
        SpeedBaseline: 2
      };
      $("#getPawnString").click(function() {
        var name, pawnstr, scale, stats, val, weight;
        scale = _.extend({}, defaultScale);
        scale.MasteryRating = Weights.mastery;
        scale.CritRating = Weights.crit;
        scale.HasteRating = Weights.haste;
        scale.Agility = Weights.agility;
        scale.Strength = Weights.strength;
        scale.MainHandDps = Shadowcraft.lastCalculation.mh_ep.mh_dps;
        scale.MainHandSpeed = (Shadowcraft.lastCalculation.mh_speed_ep["mh_2.7"] - Shadowcraft.lastCalculation.mh_speed_ep["mh_2.6"]) * 10;
        scale.OffHandDps = Shadowcraft.lastCalculation.oh_ep.oh_dps;
        scale.OffHandSpeed = (Shadowcraft.lastCalculation.oh_speed_ep["oh_1.4"] - Shadowcraft.lastCalculation.oh_speed_ep["oh_1.3"]) * 10;
        scale.MetaSocketEffect = 0;
        stats = [];
        for (weight in scale) {
          val = scale[weight];
          stats.push(weight + "=" + val);
        }
        name = "Rogue: " + ShadowcraftTalents.GetActiveSpecName();
        pawnstr = "(Pawn:v1:\"" + name + "\":" + (stats.join(",")) + ")";
        $("#generalDialog").html("<textarea style='width: 450px; height: 300px;'>" + pawnstr + "</textarea>");
        $("#generalDialog").dialog({
          modal: true,
          width: 500,
          title: "Pawn Import String"
        });
        return false;
      });
      $altslots.click($.delegate({
        ".slot": function(e) {
          var $this, EnchantLookup, Gems, ItemLookup, data, enchant_id, gem, gem_id, i, identifier, item, item_id, j, n, o, slot, socketlength, update, val;
          Shadowcraft.Console.purgeOld();
          ItemLookup = Shadowcraft.ServerData.ITEM_LOOKUP2;
          EnchantLookup = Shadowcraft.ServerData.ENCHANT_LOOKUP;
          Gems = Shadowcraft.ServerData.GEM_LOOKUP;
          data = Shadowcraft.Data;
          slot = $.data(document.body, "selecting-slot");
          update = $.data(document.body, "selecting-prop");
          $this = $(this);
          if (update === "item_id" || update === "enchant") {
            val = parseInt($this.attr("id"), 10);
            identifier = $this.data("identifier");
            data.gear[slot][update] = val !== 0 ? val : null;
            if (update === "item_id") {
              item = ItemLookup[identifier];
              if (data.gear[slot].item_id && item.upgrade_level) {
                data.gear[slot].upgrade_level = item.upgrade_level;
              } else {
                data.gear[slot].upgrade_level = null;
              }
              if (item) {
                data.gear[slot].original_id = item.original_id;
                data.gear[slot].item_level = item.ilvl;
                if (item.suffix) {
                  data.gear[slot].suffix = item.suffix;
                } else {
                  data.gear[slot].suffix = null;
                }
                if (item.sockets) {
                  socketlength = item.sockets.length;
                  for (i = j = 0; j <= 2; i = ++j) {
                    if (i >= socketlength) {
                      data.gear[slot].gems[i] = null;
                    } else if (data.gear[slot].gems[i] != null) {
                      gem = Gems[data.gear[slot].gems[i]];
                      if (gem) {
                        if (!canUseGem(Gems[data.gear[slot].gems[i]], item.sockets[i], [], slot)) {
                          data.gear[slot].gems[i] = null;
                        }
                      }
                    }
                  }
                }
                if (item.bonus_tree) {
                  data.gear[slot].bonuses = item.bonus_tree;
                }
              } else {
                data.gear[slot].original_id = null;
                data.gear[slot].item_level = null;
                for (i = n = 0; n <= 2; i = ++n) {
                  data.gear[slot].gems[i] = null;
                }
                for (i = o = 0; o <= 9; i = ++o) {
                  data.gear[slot].bonuses[i] = null;
                }
                data.gear[slot].suffix = null;
              }
            } else {
              enchant_id = !isNaN(val) ? val : null;
              item = getItem(data.gear[slot].original_id, data.gear[slot].item_level, data.gear[slot].suffix);
              if (enchant_id != null) {
                Shadowcraft.Console.log("Changing " + item.name + " enchant to " + EnchantLookup[enchant_id].name);
              } else {
                Shadowcraft.Console.log("Removing Enchant from " + item.name);
              }
            }
          } else if (update === "gem") {
            item_id = parseInt($this.attr("id"), 10);
            item_id = !isNaN(item_id) ? item_id : null;
            gem_id = $.data(document.body, "gem-slot");
            item = getItem(data.gear[slot].original_id, data.gear[slot].item_level, data.gear[slot].suffix);
            if (item_id != null) {
              Shadowcraft.Console.log("Regemming " + item.name + " socket " + (gem_id + 1) + " to " + Gems[item_id].name);
            } else {
              Shadowcraft.Console.log("Removing Gem from " + item.name + " socket " + (gem_id + 1));
            }
            data.gear[slot].gems[gem_id] = item_id;
          }
          Shadowcraft.update();
          return app.updateDisplay();
        }
      }));
      this.updateDisplay();
      $("input.search").keydown(function(e) {
        var $this, body, height, i, j, len, len1, n, next, ot, slot, slots;
        $this = $(this);
        $popup = $this.closest(".popup");
        switch (e.keyCode) {
          case 27:
            $this.val("").blur().keyup();
            e.cancelBubble = true;
            e.stopPropagation();
            break;
          case 38:
            slots = $popup.find(".slot:visible");
            for (i = j = 0, len = slots.length; j < len; i = ++j) {
              slot = slots[i];
              if (slot.className.indexOf("active") !== -1) {
                if (slots[i - 1] != null) {
                  next = $(slots[i - 1]);
                  break;
                } else {
                  next = $popup.find(".slot:visible").last();
                  break;
                }
              }
            }
            break;
          case 40:
            slots = $popup.find(".slot:visible");
            for (i = n = 0, len1 = slots.length; n < len1; i = ++n) {
              slot = slots[i];
              if (slot.className.indexOf("active") !== -1) {
                if (slots[i + 1] != null) {
                  next = $(slots[i + 1]);
                  break;
                } else {
                  next = $popup.find(".slot:visible").first();
                  break;
                }
              }
            }
            break;
          case 13:
            $popup.find(".active").click();
            return;
        }
        if (next) {
          $popup.find(".slot").removeClass("active");
          next.addClass("active");
          ot = next.get(0).offsetTop;
          height = $popup.height();
          body = $popup.find(".body");
          if (ot > body.scrollTop() + height - 30) {
            return body.animate({
              scrollTop: next.get(0).offsetTop - height + next.height() + 30
            }, 150);
          } else if (ot < body.scrollTop()) {
            return body.animate({
              scrollTop: next.get(0).offsetTop - 30
            }, 150);
          }
        }
      }).keyup(function(e) {
        var $this, all, hide, popup, search, show;
        $this = $(this);
        popup = $this.parents(".popup");
        search = $.trim($this.val().toLowerCase());
        all = popup.find(".slot:not(.active)");
        show = all.filter(":regex(data-search, " + escape(search) + ")");
        hide = all.not(show);
        show.removeClass("hidden");
        return hide.addClass("hidden");
      });
      reset = function() {
        $(".popup:visible").removeClass("visible");
        ttlib.hide();
        return $slots.find(".active").removeClass("active");
      };
      $("body").click(reset).keydown(function(e) {
        if (e.keyCode === 27) {
          return reset();
        }
      });
      $("#filter, #bonuses").click(function(e) {
        e.cancelBubble = true;
        return e.stopPropagation();
      });
      Shadowcraft.Options.bind("update", function(opt, val) {
        if (opt === 'rotation.use_hemorrhage' || opt === 'general.pvp') {
          app.updateDisplay();
        }
        if (opt === 'rotation.blade_flurry' || opt === 'general.num_boss_adds' || opt === 'general.lethal_poison') {
          return app.updateSummaryWindow();
        }
      });
      checkForWarnings('options');
      return this;
    };

    function ShadowcraftGear(app1) {
      this.app = app1;
    }

    return ShadowcraftGear;

  })();

  ShadowcraftDpsGraph = (function() {
    var MAX_POINTS;

    MAX_POINTS = 20;

    function ShadowcraftDpsGraph() {
      var app;
      this.dpsHistory = [];
      this.snapshotHistory = [];
      this.dpsIndex = 0;
      app = this;
      $("#dps .inner").html("--- DPS");
      Shadowcraft.Backend.bind("recompute", function(data) {
        return app.datapoint(data);
      });
      $("#dpsgraph").bind("plothover", function(event, pos, item) {
        if (item) {
          return tooltip({
            title: item.datapoint[1].toFixed(2) + " DPS",
            "class": 'small clean'
          }, item.pageX, item.pageY, 15, -5);
        } else {
          return $("#tooltip").hide();
        }
      });
      $("#dpsgraph").bind("plotclick", function(event, pos, item) {
        var snapshot;
        if (item) {
          app.dpsPlot.unhighlight();
          app.dpsPlot.highlight(item.series, item.datapoint);
          snapshot = app.snapshotHistory[item.dataIndex];
          return Shadowcraft.History.loadSnapshot(snapshot);
        }
      }).mousedown(function(e) {
        switch (e.button) {
          case 2:
            return false;
        }
      });
    }

    ShadowcraftDpsGraph.prototype.datapoint = function(data) {
      var delta, deltatext, snapshot;
      snapshot = Shadowcraft.History.takeSnapshot();
      delta = data.total_dps - (this.lastDPS || 0);
      deltatext = "";
      if (this.lastDPS) {
        deltatext = delta >= 0 ? " <em class='p'>(+" + (delta.toFixed(1)) + ")</em>" : " <em class='n'>(" + (delta.toFixed(1)) + ")</em>";
      }
      $("#dps .inner").html(data.total_dps.toFixed(1) + " DPS" + deltatext);
      if (snapshot) {
        this.dpsHistory.push([this.dpsIndex, Math.round(data.total_dps * 10) / 10]);
        this.dpsIndex++;
        this.snapshotHistory.push(snapshot);
        if (this.dpsHistory.length > MAX_POINTS) {
          this.dpsHistory.shift();
          this.snapshotHistory.shift();
        }
        this.dpsPlot = $.plot($("#dpsgraph"), [this.dpsHistory], {
          lines: {
            show: true
          },
          crosshair: {
            mode: "y"
          },
          points: {
            show: true
          },
          grid: {
            hoverable: true,
            clickable: true,
            autoHighlight: true
          },
          series: {
            threshold: {
              below: this.dpsHistory[0][1],
              color: "rgb(200, 20, 20)"
            }
          }
        });
      }
      return this.lastDPS = data.total_dps;
    };

    return ShadowcraftDpsGraph;

  })();

  ShadowcraftConsole = (function() {
    function ShadowcraftConsole() {
      this.$log = $("#log .inner");
      this.console = $("#console");
      this.consoleInner = $("#console .inner");
    }

    ShadowcraftConsole.prototype.boot = function() {
      return $("#console .inner, #log .inner").oneFingerScroll();
    };

    ShadowcraftConsole.prototype.log = function(msg, klass) {
      var date, now;
      date = new Date();
      now = Math.round(date / 1000);
      msg = "[" + date.getHours() + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2) + "] " + msg;
      return this.$log.append("<div class='" + klass + "' data-created='" + now + "'>" + msg + "</div>").scrollTop(this.$log.get(0).scrollHeight);
    };

    ShadowcraftConsole.prototype.warn = function(item, msg, submsg, klass, section) {
      this.consoleMessage(item, msg, submsg, "warning", klass, section);
      return this.purgeOld();
    };

    ShadowcraftConsole.prototype.consoleMessage = function(item, msg, submsg, severity, klass, section) {
      var fullMsg;
      fullMsg = Templates.log({
        name: item.name,
        quality: item.quality,
        message: msg,
        submsg: submsg,
        severity: severity,
        messageClass: klass,
        section: section
      });
      this.console.show();
      return this.consoleInner.append(fullMsg);
    };

    ShadowcraftConsole.prototype.hide = function() {
      if (!this.consoleInner.html().trim()) {
        return this.console.hide();
      }
    };

    ShadowcraftConsole.prototype.remove = function(selector) {
      this.consoleInner.find("div" + selector).remove();
      if (!this.consoleInner.html().trim()) {
        return this.console.hide();
      }
    };

    ShadowcraftConsole.prototype.clear = function() {
      return this.consoleInner.empty();
    };

    ShadowcraftConsole.prototype.purgeOld = function(age) {
      var now;
      if (age == null) {
        age = 60;
      }
      now = Math.round(+new Date() / 1000);
      return $("#log .inner div").each(function() {
        var $this, created;
        $this = $(this);
        created = $this.data("created");
        if (created + age < now) {
          return $this.fadeOut(500, function() {
            return $this.remove();
          });
        }
      });
    };

    return ShadowcraftConsole;

  })();

  window.Shadowcraft = new ShadowcraftApp;

}).call(this);
