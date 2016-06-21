class ShadowcraftTalents
  talentsSpent = 0
  MAX_TALENT_POINTS = 7
  TREE_SIZE = 7
  ALWAYS_SHOW_GLYPHS = []
  CHARACTER_SPEC = ""
  SPEC_ICONS =
    "a": "ability_rogue_eviscerate"
    "Z": "ability_backstab"
    "b": "ability_stealth"
    "": "class_rogue"
  DEFAULT_SPECS =
    "Stock Assassination":
      talents: "2211021"
      glyphs: [45761,110853,110850]
      spec: "a"
    "Stock Combat":
      talents: "2211011"
      glyphs: [110853,110850]
      spec: "Z"
    "Stock Subtlety":
      talents: "1210011"
      glyphs: [42970,63420,110850]
      spec: "b"

  @GetActiveSpecName = ->
    activeSpec = getSpec()
    if activeSpec
      return getSpecName(activeSpec)
    return ""

  getSpecName = (s) ->
    if s == "a"
      return "Assassination"
    else if s == "Z"
      return "Combat"
    else if s == "b"
      return "Subtlety"
    else
      return "Rogue"

  updateTalentAvailability = (selector) ->
    talents = if selector then selector.find(".talent") else $("#talentframe .tree .talent")
    talents.each ->
      $this = $(this)
      pos = $.data(this, "position")
      points = $.data(this, "points")
      tree = $.data(pos.tree, "info")
      icons = $.data(this, "icons")
      if tree.rowPoints[pos.row] >= 1 and points.cur != 1
        $this.css({backgroundImage: icons.grey}).removeClass("active")
      else
        $this.css({backgroundImage: icons.normal}).addClass("active")
    Shadowcraft.Talents.trigger("changed")
    Shadowcraft.update()
    checkForWarnings("talents")

  hoverTalent = ->
    return if Modernizr.touch
    points = $.data(this, "points")
    talent = $.data(this, "talent")
    rank = if talent.rank.length then talent.rank[points.cur - 1] else talent.rank
    nextRank = if talent.rank.length then talent.rank[points.cur] else null
    pos = $(this).offset()
    tooltip({
      title: talent.name + " (" + points.cur + "/" + points.max + ")",
      desc: if rank then rank.description else null,
      nextdesc: if nextRank then "Next rank: " + nextRank.description else null

    }, pos.left, pos.top, 130, -20)

  resetTalents = ->
    data = Shadowcraft.Data
    $("#talentframe .talent").each ->
      points = $.data(this, "points")
      applyTalentToButton(this, -points.cur, true, true)
    data.activeTalents = getTalents()
    updateTalentAvailability()

  setTalents = (str) ->
    data = Shadowcraft.Data
    if !str
      updateTalentAvailability(null)
      return
    talentsSpent = 0
    $("#talentframe .talent").each ->
      position = $.data(this, "position")
      points = $.data(this, "points")
      p = 0
      if str[position.row] != "." and position.col == parseInt(str[position.row], 10)
        p = 1
      applyTalentToButton(this, p - points.cur, true, true)
    data.activeTalents = getTalents()
    updateTalentAvailability(null)

  getTalents = ->
    talent_rows = ['.','.','.','.','.','.','.']
    $("#talentframe .talent").each ->
      position = $.data(this, "position")
      points = $.data(this, "points")
      if points.cur == 1
        talent_rows[position.row] = position.col
    talent_rows.join('')

  setSpec = (str) ->
    data = Shadowcraft.Data
    buffer = Templates.specActive({
      name: getSpecName(str)
      icon: SPEC_ICONS[str]
    })
    $("#specactive").get(0).innerHTML = buffer
    Shadowcraft.Talents.trigger("changedSpec", str)
    data.activeSpec = str

  getSpec = ->
    data = Shadowcraft.Data
    return data.activeSpec

  applyTalentToButton = (button, dir, force, skipUpdate) ->
    data = Shadowcraft.Data

    points = $.data(button, "points")
    position = $.data(button, "position")

    tree = $.data(position.tree, "info")
    success = false
    if force
      success = true
    else if dir == 1 && points.cur < points.max # && talentsSpent < MAX_TALENT_POINTS
      success = true
      # a bit hacky but otherwise I had to rewrite the complete talent module
      $("#talentframe .talent").each ->
        position2 = $.data(this, "position")
        points2 = $.data(this, "points")
        if points2.cur == 1 and position2.row == position.row
          applyTalentToButton(this, -points2.cur)
    else if dir == -1
      success = true

    if success
      points.cur += dir
      tree.points += dir
      talentsSpent += dir
      tree.rowPoints[position.row] += dir

      $.data(button, "spentButton").text(tree.points)
      unless skipUpdate
        data.activeTalents = getTalents()
        updateTalentAvailability $(button).parent()
    return success

  updateActiveTalents: ->
    data = Shadowcraft.Data
    if not data.activeSpec
      data.activeTalents = data.talents[data.active].talents
      data.activeSpec = data.talents[data.active].spec
      data.glyphs = data.talents[data.active].glyphs
    setSpec data.activeSpec
    setTalents data.activeTalents
    this.setGlyphs data.glyphs

  initTalentTree: ->
    Talents = Shadowcraft.ServerData.TALENTS_WOD
    TalentLookup = Shadowcraft.ServerData.TALENT_LOOKUP_WOD

    buffer = ""

    talentTiers = [{tier:"0",level:"15"},{tier:"1",level:"30"},{tier:"2",level:"45"},{tier:"3",level:"60"},{tier:"4",level:"75"},{tier:"5",level:"90"},{tier:"6",level:"100"}]
    talentTiers = _.filter(talentTiers, (tier) ->
      return tier.level <= (Shadowcraft.Data.options.general.level || 100)
    )

    buffer += Templates.talentTier({
      background: 1,
      levels: talentTiers
    })
    for treeIndex, tree of Talents
      tree = _.filter(tree, (talent) ->
        return parseInt(talent.tier, 10) <= (talentTiers.length-1)
      )
      buffer += Templates.talentTree({
        background: 1,
        talents: tree
      })
    talentframe = $("#talentframe")
    tframe = talentframe.get(0)
    tframe.innerHTML = buffer
    $(".tree, .tree .talent, .tree .talent .points").disableTextSelection()

    talentTrees = $("#talentframe .tree")
    $("#talentframe .talent").each(->
      row = parseInt(this.className.match(/row-(\d)/)[1], 10)
      col = parseInt(this.className.match(/col-(\d)/)[1], 10)
      $this = $(this)
      trees = $this.closest(".tree")
      myTree = trees.get(0)
      tree = talentTrees.index(myTree)
      talent = TalentLookup[row + ":" + col]
      $.data(this, "position", {tree: myTree, treeIndex: tree, row: row, col: col})
      $.data(myTree, "info", {points: 0, rowPoints: [0, 0, 0, 0, 0, 0, 0]})
      $.data(this, "talent", talent)
      $.data(this, "points", {cur: 0, max: talent.maxRank})
      $.data(this, "pointsButton", $this.find(".points"))
      $.data(this, "spentButton", trees.find(".spent"))
      $.data(this, "icons", {grey: $this.css("backgroundImage"), normal: $this.css("backgroundImage").replace(/\/grey\//, "/")})
    ).mousedown((e) ->
      #return if !$(this).hasClass("active")
      return if Modernizr.touch
      switch(e.button)
        when 0
          Shadowcraft.update() if applyTalentToButton(this, 1)
        when 2
          return if !$(this).hasClass("active")
          Shadowcraft.update() if applyTalentToButton(this, -1)

      $(this).trigger("mouseenter")
    ).bind("contextmenu", -> false )
    .mouseenter($.delegate
      ".tt": ttlib.requestTooltip
    )
    .mouseleave($.delegate
      ".tt": ttlib.hide
    )
    .bind("touchstart", (e) ->
      $.data(this, "removed", false)
      $.data(this, "listening", true)
      $.data(tframe, "listening", this)
    ).bind("touchend", (e) ->
      $.data(this, "listening", false)
      unless $.data(this, "removed") or !$(this).hasClass("active")
        Shadowcraft.update() if applyTalentToButton(this, 1)
    )

    talentframe.bind("touchstart", (e) ->
      listening = $.data(tframe, "listening")
      if e.originalEvent.touches.length > 1 and listening and $.data(listening, "listening")
        Shadowcraft.update() if applyTalentToButton.call(listening, listening, -1)
        $.data(listening, "removed", true)
    )

  initTalentsPane: ->
    this.initTalentTree()

    data = Shadowcraft.Data
    buffer = ""
    for talent in data.talents
      buffer += Templates.talentSet({
        talent_string: talent.talents,
        glyphs: talent.glyphs.join(","),
        name: "Imported " + getSpecName(talent.spec),
        spec: talent.spec
      })

    for talentName, talentSet of DEFAULT_SPECS
      buffer += Templates.talentSet({
        talent_string: talentSet.talents,
        glyphs: talentSet.glyphs.join(","),
        name: talentName,
        spec: talentSet.spec
      })

    $("#talentsets").get(0).innerHTML = buffer
    this.updateActiveTalents()

  setGlyphs: (glyphs) ->
    Shadowcraft.Data.glyphs = glyphs
    this.updateGlyphDisplay()

  initGlyphs: ->
    buffer = [null, "", ""]
    Glyphs = Shadowcraft.ServerData.GLYPHS
    data = Shadowcraft.Data
    if not data.glyphs
      data.glyphs = data.talents[data.active].glyphs

    for g, idx in Glyphs
      buffer[g.rank] += Templates.glyphSlot(g)

    $("#major-glyphs .inner").get(0).innerHTML = buffer[1]
    $("#minor-glyphs .inner").get(0).innerHTML = buffer[2]
    this.updateGlyphDisplay()

  updateGlyphDisplay: ->
    Glyphs = Shadowcraft.ServerData.GLYPHS
    data = Shadowcraft.Data
    return unless data.glyphs?

    for glyph, idx in Glyphs
      g = $(".glyph_slot[data-id='" + glyph.id + "']")
      if glyph.id in data.glyphs
        setGlyph(g, true)
      else
        setGlyph(g, false)
    checkForWarnings('glyphs')

  updateGlyphWeights = (data) ->
    max = _.max(data.glyph_ranking)
    # $(".glyph_slot:not(.activated)").hide()
    $(".glyph_slot .pct-inner").css({width: 0})
    for key, weight of data.glyph_ranking
      g = Shadowcraft.ServerData.GLYPHNAME_LOOKUP[key]
      if g
        width = weight / max * 100
        slot = $(".glyph_slot[data-id='" + g.id + "']")
        $.data(slot[0], "weight", weight)
        slot.show().find(".pct-inner").css({width: width + "%"})
        slot.find(".label").text(weight.toFixed(1) + " DPS")

    for id in ALWAYS_SHOW_GLYPHS
      $(".glyph_slot[data-id='#{id}']").show()

    glyphSets = $(".glyphset")
    for glyphSet in glyphSets
      $(glyphSet).find(".glyph_slot").sortElements (a, b) ->
        gl = Shadowcraft.ServerData.GLYPH_LOOKUP
        aa = if $(a).hasClass("activated") then 1 else 0
        ba = if $(b).hasClass("activated") then 1 else 0
        aw = $.data(a, "weight")
        bw = $.data(b, "weight")
        if gl
          an = gl[$.data(a, "id")].name
          bn = gl[$.data(b, "id")].name
        aw ||= -1; bw ||= -1; an ||= ""; bn ||= ""
        if aw != bw
          if aw > bw then -1 else 1
        else
          if aa != ba
            if aa > ba then -1 else 1
          else
            if an > bn then 1 else -1

  glyphRankCount = (rank, g) ->
    data = Shadowcraft.Data
    GlyphLookup = Shadowcraft.ServerData.GLYPH_LOOKUP
    if g and !rank
      rank = GlyphLookup[g].rank

    count = 0
    for glyph in data.glyphs
      if GlyphLookup[glyph]?
        count++ if GlyphLookup[glyph].rank == rank
    count

  setGlyph = (e, active) ->
    $e = $(e)
    $set = $e.parents(".glyphset")
    id = parseInt($e.data("id"), 10)
    if active
      $e.addClass("activated")
    else
      $e.removeClass("activated")
      $set.removeClass("full")
    if glyphRankCount(null, id) >= 3
      $set.addClass("full")
    else
      $set.removeClass("full")

  toggleGlyph = (e, override) ->
    data = Shadowcraft.Data

    $e = $(e)
    $set = $e.parents(".glyphset")
    id = parseInt($e.data("id"), 10)
    if $e.hasClass("activated")
      $e.removeClass("activated")
      data.glyphs = _.without(data.glyphs, id)
      $set.removeClass("full")
    else
      return if glyphRankCount(null, id) >= 3 and !override
      $e.addClass("activated")
      if !override and data.glyphs.indexOf(id) == -1
        data.glyphs.push(id)
      if glyphRankCount(null, id) >= 3
        $set.addClass("full")

    checkForWarnings('glyphs')
    Shadowcraft.update()

  updateTalentContribution = (LC) ->
    return unless LC.talent_ranking
    sets = {
      "Primary": LC.talent_ranking,
    }
    rankings = _.extend({}, LC.talent_ranking)
    max = _.max(rankings)
    $("#talentrankings .talent_contribution").hide()
    for setKey, setVal of sets
      buffer = ""
      target = $("#talentrankings ." + setKey)
      for k, s of setVal
        exist = $("#talentrankings #talent-weight-" + k)
        val = parseInt(s, 10)
        name = k.replace(/_/g, " ").capitalize
        if isNaN(val)
          name += " (NYI)"
          val = 0

        pct = val / max * 100 + 0.01

        if exist.length == 0
          buffer = Templates.talentContribution({
            name: name,
            raw_name: k,
            val: val.toFixed(1),
            width: pct
          })
          target.append(buffer)

        exist = $("#talentrankings #talent-weight-" + k)
        $.data(exist.get(0), "val", val)
        exist.show().find(".pct-inner").css({width: pct + "%"})
        exist.find(".name").text(name)
        exist.find(".label").text(val.toFixed(1))

    $("#talentrankings .talent_contribution").sortElements (a, b) ->
      ad = $.data(a, "val")
      bd = $.data(b, "val")
      if ad > bd then -1 else 1

  boot: ->
    this.initTalentsPane()
    this.initGlyphs()
    app = this

    Shadowcraft.Backend.bind("recompute", updateTalentContribution)
    Shadowcraft.Backend.bind("recompute", updateGlyphWeights)

    $("#glyphs").click($.delegate
      ".glyph_slot": -> toggleGlyph(this)
    ).mouseover($.delegate
      ".glyph_slot": ttlib.requestTooltip
    ).mouseout($.delegate
      ".glyph_slot": ttlib.hide
    )

    $("#talentsets").click $.delegate({
      ".talent_set": ->
        spec = $(this).data("spec")
        talents = $(this).data("talents")+""
        glyphs = ($(this).data("glyphs")+"" || "").split ","
        for glyph, i in glyphs
          glyphs[i] = parseInt(glyph, 10)
        glyphs = _.compact(glyphs)
        setSpec spec
        Shadowcraft.Artifact.setSpec str
        setTalents talents
        app.setGlyphs glyphs
    })
    $("#reset_talents").click(resetTalents)

    Shadowcraft.bind "loadData", ->
      app.updateActiveTalents()
      #app.updateGlyphDisplay()

    Shadowcraft.Options.bind "update", (opt, val) ->
      if opt in ['general.patch','general.level']
        app.initTalentTree()
        app.updateActiveTalents()
        checkForWarnings('options')

    $("#talents #talentframe").mousemove (e) ->
      $.data document, "mouse-x", e.pageX
      $.data document, "mouse-y", e.pageY
    this

  constructor: (@app) ->
    @app.Talents = this
    @resetTalents = resetTalents
    @setTalents = setTalents
    @getTalents = getTalents
    _.extend(this, Backbone.Events)
