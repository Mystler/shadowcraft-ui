class ShadowcraftGear

  FACETS = {
    ITEM: 1
    GEMS: 2
    ENCHANT: 4
    ALL: 255
  }
  @FACETS = FACETS

  SLOT_ORDER = ["0", "1", "2", "14", "4", "8", "9", "5", "6", "7", "10", "11", "12", "13", "15", "16"]
  SLOT_DISPLAY_ORDER = [["0", "1", "2", "14", "4", "8", "15", "16"], ["9", "5", "6", "7", "10", "11", "12", "13"]]
  PROC_ENCHANTS =
    5330: "mark_of_the_thunderlord"
    5331: "mark_of_the_shattered_hand"
    5334: "mark_of_the_frostwolf"
    5337: "mark_of_warsong"
    5384: "mark_of_the_bleeding_hollow"

  LEGENDARY_RINGS=[118302, 118307, 124636]
  @ARTIFACTS = [128476, 128479, 128872, 134552, 128869, 128870]
  @ARTIFACT_SETS =
    a:
      mh: 128870
      oh: 128869
    Z:
      mh: 128872
      oh: 134552
    b:
      mh: 128476
      oh: 128479

  Sets =
    T18:
      ids: [124248, 124257, 124263, 124269, 124274]
      bonuses: {4: "rogue_t18_4pc", 2: "rogue_t18_2pc"}
    T18_LFR:
      ids: [128130, 128121, 128125, 128054, 128131, 128137]
      bonuses: {4: "rogue_t18_4pc_lfr"}
    T19:
      ids: [138326, 138329, 138332, 138335, 138338, 138371]
      bonuses: {4: "rogue_t19_4pc", 2: "rogue_t19_2pc"}
    ORDERHALL:
      ids: [139739, 139740, 139741, 139742, 139743, 139744, 139745, 139746]
      bonuses: {8: "rogue_orderhall_8pc"}

  # Default weights for the DPS calculations. These get reset by calculation
  # passes through the engine.
  Weights =
    attack_power: 1
    agility: 1.1
    crit: 0.87
    haste: 1.44
    mastery: 1.15
    multistrike: 1.12
    versatility: 1.2
    strength: 1.05

  SLOT_INVTYPES =
      0: 1 # head
      1: 2 # neck
      2: 3 # shoulder
      14: 16 # back
      4: 5 # chest
      8: 9 # wrist
      9: 10 # gloves
      5: 6 # belt
      6: 7 # legs
      7: 8 # boots
      10: 11 # ring1
      11: 11 # ring2
      12: 12 # trinket1
      13: 12 # trinket2
      15: "mainhand" # mainhand
      16: "offhand" # offhand

  EP_PRE_REGEM = null
  EP_TOTAL = null
  $slots = null
  $popupbody = null
  $popup = null

  @initialized = false

  getRandPropRow = (slotIndex) ->
    slotIndex = parseInt(slotIndex, 10)
    switch slotIndex
      when 0, 4, 6
        return 0
      when 2, 5, 7, 9, 12, 13
        return 1
      when 1, 8, 10, 11, 14
        return 2
      when 15, 16
        return 3
      else
        return 2

  statOffset = (gear, facet) ->
    offsets = {}
    if gear
      Shadowcraft.Gear.sumSlot(gear, offsets, facet)
    return offsets

  # Generates a map of all of the stats for an item, summing each of the sources
  # together.
  sumItem = (s, i, key) ->
    key ||= 'stats'
    for stat of i[key]
      s[stat] ||= 0
      s[stat] += i[key][stat]
    null

  # Gets the EP value for an item out of the last run of calculation data
  getEP = (item, slot=-1, ignore=[]) ->

    stats = {}
    sumItem(stats, item)

    # Add all of the EP for all of the stats
    total = 0
    for stat, value of stats
      weight = getStatWeight(stat, value, ignore) || 0
      total += weight

    # If there was already a calculation done, there's some extra EP to add based on
    # weapon damage, enchants, and trinkets.
    c = Shadowcraft.lastCalculation
    if c
      if item.dps
        if slot == 15
          total += (item.dps * c.mh_ep.mh_dps) + c.mh_speed_ep["mh_" + item.speed]
          if c.mh_type_ep?
            if item.subclass == 15
              total += c.mh_type_ep["mh_type_dagger"]
            else
              total += c.mh_type_ep["mh_type_one-hander"]
        else if slot == 16
          total += (item.dps * c.oh_ep.oh_dps) + c.oh_speed_ep["oh_" + item.speed]
          if c.oh_type_ep?
            if item.subclass == 15
              total += c.oh_type_ep["oh_type_dagger"]
            else
              total += c.oh_type_ep["oh_type_one-hander"]
      else if PROC_ENCHANTS[item.id]
        switch slot
          when 14
            pre = ""
          when 15
            pre = "mh_"
          when 16
            pre = "oh_"
        enchant = PROC_ENCHANTS[item.id]
        if !pre and enchant
          total += c["other_ep"][enchant]
        else if pre and enchant
          total += c[pre + "ep"][pre + enchant]

      # If this is a trinket, include the value of the proc in the EP value
      item_level = item.ilvl
      if c.trinket_map[item.id]
        proc_name = c.trinket_map[item.id]
        if c.proc_ep[proc_name] and c.proc_ep[proc_name][item_level]
          total += c.proc_ep[proc_name][item_level]
        else
          console.warn "error in trinket_ranking", item_level, item.name

    total

  # Generates a stat block for a slot. This method can be used to limit the stats to
  # a specific type of data by passing a facet to the method, or to return all of the
  # stats for the item including normal stats, gems, and enchants.
  sumSlot: (gear, out, facets) ->
    return unless gear?.id?
    facets ||= FACETS.ALL

    item = getItem(gear.id, gear.context)
    return unless item?

    if (facets & FACETS.ITEM) == FACETS.ITEM
      sumItem(out, item)

    if (facets & FACETS.GEMS) == FACETS.GEMS
      matchesAllSockets = item.sockets and item.sockets.length > 0
      for socketIndex, socket of item.sockets
        if gear.gems?
          gid = gear.gems[socketIndex]
          if gid and gid > 0
            gem = Shadowcraft.ServerData.GEM_LOOKUP[gid]
            sumItem(out, gem) if(gem)
          matchesAllSockets = false if !gem or !gem[socket]

      if matchesAllSockets
        sumItem(out, item, "socketbonus")

    if (facets & FACETS.ENCHANT) == FACETS.ENCHANT
      enchant_id = gear.enchant
      if enchant_id and enchant_id > 0
        enchant = Shadowcraft.ServerData.ENCHANT_LOOKUP[enchant_id]
        sumItem(out, enchant) if enchant

  # Returns the complete stats for all of the items added together for a character.
  # Facets can be used to limit the data to the item, gems, or enchants.
  sumStats: (facets) ->
    stats = {}
    data = Shadowcraft.Data

    for si, i in SLOT_ORDER
      Shadowcraft.Gear.sumSlot(data.gear[si], stats, facets)

    @statSum = stats
    return stats

  # Returns a single stat from all of the stats for a character.
  getStat: (stat) ->
    this.sumStats() if !@statSum
    (@statSum[stat] || 0)

  # Stat to get the real weight for, the amount of the stat, and a hash of {stat: amount} to
  # ignore (like if swapping out a enchant or whatnot; nil the existing enchant for calcs)
  getStatWeight = (stat, num, ignore, ignoreAll) ->
    exist = 0
    unless ignoreAll
      exist = Shadowcraft.Gear.getStat(stat)
      if ignore and ignore[stat]
        exist -= ignore[stat]

    neg = if num < 0 then -1 else 1
    num = Math.abs(num)

    return (Weights[stat] || 0) * num * neg

  # Sort comparator that sorts items in reverse order (highest first)
  sortComparator = (a, b) ->
    b.__ep - a.__ep

  # Sorts a list of item IDs based on their EP value. This requires repeatedly calling
  # getEP for every item, then sorting the resulting list.
  epSort = (list) ->
    for item in list
      item.__ep = getEP(item) if item
      item.__ep = 0 if isNaN(item.__ep)
    list.sort(sortComparator)

  # Calculate the EP bonus for a set bonus based on the set type and the number of pieces.
  setBonusEP = (set, count) ->
    return 0 unless c = Shadowcraft.lastCalculation

    total = 0
    for p, bonus_name of set.bonuses
      if count == (p-1)
        total += c["other_ep"][bonus_name]

    return total

  # Returns the number of pieces for each gear set that are equipped. This is used to call
  # setBonusEP to determine the EP bonus for the equipped set pieces.
  getEquippedSetCount = (setIds, ignoreSlotIndex) ->
    count = 0
    for slot in SLOT_ORDER
      continue if SLOT_INVTYPES[slot] == ignoreSlotIndex
      gear = Shadowcraft.Data.gear[slot]
      if gear.id in setIds
        count++
    return count

  # TODO: there's no reason to have two methods here
  isProfessionalGem = (gem, profession) ->
    return false unless gem?
    gem.requires?.profession? and gem.requires.profession == profession

  canUseGem = (gem, gemType) ->
    if gem.requires?.profession?
      return false if isProfessionalGem(gem, 'jewelcrafting')

    return false if not gem[gemType]
    true

  # Check if the gems have equal stats to pretend that optimize gems not change gems to
  # stat equal gems
  equalGemStats = (from_gem,to_gem) ->
    for stat of from_gem["stats"]
      if !to_gem["stats"][stat]? or from_gem["stats"][stat] != to_gem["stats"][stat]
        return false
    return true

  # Determines the best set of gems for an item.
  getGemmingRecommendation = (gem_list, item, offset) ->
    if !item.sockets or item.sockets.length == 0
      return {ep: 0, gems: []}

    straightGemEP = 0
    sGems = []
    for gemType in item.sockets
      broke = false
      for gem in gem_list
        continue unless canUseGem(gem, gemType)
        continue if gem.name.indexOf('Taladite') >= 0 and item.quality == 7 and item.ilvl <= 620
        continue if gem.name.indexOf('Taladite') >= 0 and item.id == 102248 and item.ilvl <= 616
        straightGemEP += getEP(gem, null, offset)
        sGems.push gem.id
        broke = true
        break
      sGems.push null if !broke

    epValue = straightGemEP
    gems = sGems
    return {ep: epValue, takeBonus: true, gems: gems}

  # Called when a user clicks the Lock All button
  lockAll: () ->
    Shadowcraft.Console.log("Locking all items")
    for slot in SLOT_ORDER
      gear = Shadowcraft.Data.gear[slot]
      gear.locked = true
    Shadowcraft.Gear.updateDisplay()

  # Called when a user clicks the Unlock All button
  unlockAll: () ->
    Shadowcraft.Console.log("Unlocking all items")
    for slot in SLOT_ORDER
      gear = Shadowcraft.Data.gear[slot]
      gear.locked = false
    Shadowcraft.Gear.updateDisplay()

  # Called when a user clicks the Optimize Gems button. This recursively looks for
  # the best gem configuration across all of the items down, checking up to 10
  # times.
  optimizeGems: (depth) ->
    Gems = Shadowcraft.ServerData.GEM_LOOKUP
    data = Shadowcraft.Data

    depth ||= 0
    if depth == 0
      Shadowcraft.Console.purgeOld()
      EP_PRE_REGEM = @getEPTotal()
      Shadowcraft.Console.log "Beginning auto-regem...", "gold underline"
    madeChanges = false
    gem_list = getGemRecommendationList()
    for slotIndex in SLOT_ORDER
      slotIndex = parseInt(slotIndex, 10)
      gear = data.gear[slotIndex]
      continue unless gear
      continue if gear.locked
      continue if gear.id in ShadowcraftGear.ARTIFACTS

      item = getItemByContext(gear.id, gear.context)
      gem_offset = statOffset(gear, FACETS.GEMS)

      if item
        rec = getGemmingRecommendation(gem_list, item, gem_offset)
        for gem, gemIndex in rec.gems
          from_gem = Gems[gear.gems[gemIndex]]
          to_gem = Gems[gem]
          continue unless to_gem?
          if gear.gems[gemIndex] != gem
            if from_gem && to_gem
              continue if from_gem.name == to_gem.name
              continue if equalGemStats(from_gem, to_gem)
              Shadowcraft.Console.log "Regemming #{item.name} socket #{gemIndex+1} from #{from_gem.name} to #{to_gem.name}"
            else
              Shadowcraft.Console.log "Regemming #{item.name} socket #{gemIndex+1} to #{to_gem.name}"

            gear.gems[gemIndex] = gem
            madeChanges = true

    # If we didn't make changes on this pass, or we've went down 10 levels already
    # then stop, update the DPS calculation, update the display, and log the changes.
    # Otherwise, make another call to try again.
    if !madeChanges or depth >= 10
      @app.update()
      this.updateDisplay()
      Shadowcraft.Console.log "Finished automatic regemming: &Delta; #{Math.floor(@getEPTotal() - EP_PRE_REGEM)} EP", "gold"
    else
      this.optimizeGems(depth + 1)

  # Gets the first enchant from a list of enchants that can be applied to an item
  # based on ilvl. enchant_list is assumed to be a list of enchants sorted by
  # EP.
  getEnchantRecommendation = (enchant_list, item) ->

    for enchant in enchant_list
      # do not consider enchant if item level is higher than allowed maximum
      continue if enchant.requires?.max_item_level? and enchant.requires?.max_item_level < getBaseItemLevel(item)
      return enchant.id
    return false

  # Gets a list of enchants that apply to an item slot, sorted by EP.
  getApplicableEnchants = (slotIndex, item, enchant_offset) ->
    enchant_list = Shadowcraft.ServerData.ENCHANT_SLOTS[SLOT_INVTYPES[slotIndex]]
    unless enchant_list?
      return []

    enchants = []
    for enchant in enchant_list
      # do not show enchant if item level is higher than allowed maximum
      continue if enchant.requires?.max_item_level? and enchant.requires?.max_item_level < getBaseItemLevel(item)
      enchant.__ep = getEP(enchant, slotIndex, enchant_offset)
      enchant.__ep = 0 if isNaN(enchant.__ep)
      enchants.push(enchant)
    enchants.sort(sortComparator)
    return enchants

  getApplicableEnchants: (slotIndex, item, enchant_offset) ->
    return getApplicableEnchants(slotIndex, item, enchant_offset)

  # Called when a user clicks the Optimize Enchants button. This recursively looks
  # for the best gem configuration across all of the items down, checking up to 10
  # times.
  optimizeEnchants: (depth) ->
    Enchants = Shadowcraft.ServerData.ENCHANT_LOOKUP
    data = Shadowcraft.Data

    depth ||= 0
    if depth == 0
      Shadowcraft.Console.purgeOld()
      EP_PRE_REGEM = @getEPTotal()
      Shadowcraft.Console.log "Beginning auto-enchant...", "gold underline"
    madeChanges = false
    for slotIndex in SLOT_ORDER
      slotIndex = parseInt(slotIndex, 10)

      gear = data.gear[slotIndex]
      continue unless gear
      continue if gear.locked

      item = getItem(gear.id, gear.context)
      continue unless item
      enchant_offset = statOffset(gear, FACETS.ENCHANT)

      enchants = getApplicableEnchants(slotIndex, item, enchant_offset)

      if item
        enchantId = getEnchantRecommendation(enchants, item)
        if enchantId
          from_enchant = Enchants[gear.enchant]
          to_enchant = Enchants[enchantId]
          if from_enchant && to_enchant
            continue if from_enchant.id == to_enchant.id
            Shadowcraft.Console.log "Change enchant of #{item.name} from #{from_enchant.name} to #{to_enchant.name}"
          else
            Shadowcraft.Console.log "Enchant #{item.name} with #{to_enchant.name}"
          gear.enchant = enchantId
          madeChanges = true

    if !madeChanges or depth >= 10
      @app.update()
      this.updateDisplay()
      Shadowcraft.Console.log "Finished automatic enchanting: &Delta; #{Math.floor(@getEPTotal() - EP_PRE_REGEM)} EP", "gold"
    else
      this.optimizeEnchants depth + 1

  # TODO: what does this do?
  getBestNormalGem = ->
    Gems = Shadowcraft.ServerData.GEMS
    # TODO: why copy this?
    copy = $.extend(true, [], Gems)
    list = []
    for gem in copy
      continue if gem.requires? or gem.requires?.profession?
      gem.__color_ep = gem.__color_ep || getEP(gem)
      if (gem["Red"] or gem["Yellow"] or gem["Blue"]) and gem.__color_ep and gem.__color_ep > 1
        list.push gem

    list.sort (a, b) ->
      b.__color_ep - a.__color_ep
    list[0]

  # Returns an EP-sorted list of gems with the twist that the
  # JC-only gems are sorted at the same EP-value as regular gems.
  # This prevents the automatic picking algorithm from choosing
  # JC-only gems over the slot bonus.
  getGemRecommendationList = ->
    Gems = Shadowcraft.ServerData.GEMS
    copy = $.extend(true, [], Gems)
    list = []
    use_epic_gems = Shadowcraft.Data.options.general.epic_gems == 1
    for gem in copy
      continue if gem.quality == 4 and gem.requires == undefined and not use_epic_gems
      gem.normal_ep = getEP(gem)
      if gem.normal_ep and gem.normal_ep > 1
        list.push gem

    list.sort (a, b) ->
      b.normal_ep - a.normal_ep
    list

  clearBonuses = ->
    console.log 'clear'
    return

  # Called when a user clicks the apply button on the bonuses popup
  # window. This adds a bonus to an item in the user's gear.
  applyBonuses: ->
    Shadowcraft.Console.purgeOld()
    data = Shadowcraft.Data
    slot = $.data(document.body, "selecting-slot")
    gear = data.gear[slot]
    return unless gear
    item = getItem(gear.id, gear.context)

    currentBonuses = []
    if gear.bonuses?
      currentBonuses = gear.bonuses

    checkedBonuses = []
    uncheckedBonuses = []
    $("#bonuses input:checkbox").each ->
      val = parseInt($(this).val(), 10)
      if $(this).is(':checked')
        checkedBonuses.push val
      else
        uncheckedBonuses.push val

    $("#bonuses select option").each ->
      val = parseInt($(this).val(), 10)
      if $(this).is(':selected')
        checkedBonuses.push val
      else
        uncheckedBonuses.push val

    union = _.union(currentBonuses, checkedBonuses)
    newBonuses = _.difference(union, uncheckedBonuses)

    # remove all from old bonuses
    for bonus in currentBonuses
      if bonus in uncheckedBonuses
        applyBonusToItem(item, bonus, slot, false)

    # apply new bonuses
    gear.bonuses = newBonuses

    $("#bonuses").removeClass("visible")
    Shadowcraft.update()
    Shadowcraft.Gear.updateDisplay()

  # Adds a bonus to an item.
  applyBonusToItem = (item, bonusId, slot, apply = true) ->
    for bonus_entry in Shadowcraft.ServerData.ITEM_BONUSES[bonusId]
      switch bonus_entry.type
        when 6 # cool extra sockets
          if apply
            last = item.sockets[item.sockets.length - 1]
            item.sockets.push "Prismatic"
            if item.gems?
              item.gems.push(0)
            else
              item.gems = []
          else
            item.sockets.pop()
        when 5 # item name suffix
          if apply
            item.name_suffix = bonus_entry.val1
          else
            item.name_suffix = ""
        when 2 # awesome extra stats
          value = Math.round(bonus_entry.val2 / 10000 * Shadowcraft.ServerData.RAND_PROP_POINTS[item.ilvl][1 + getRandPropRow(slot)])
          item.stats[bonus_entry.val1] ||= 0
          if apply
            item.stats[bonus_entry.val1] = value
          else
            item.stats[bonus_entry.val1] -= value

  hasSocket = (gear) ->
    # This is all of the bonus IDs that mean +socket. Ridiculous.
    socketBonuses = [523, 572, 608]
    socketBonuses = socketBonuses.concat([563..565])
    socketBonuses = socketBonuses.concat([715..719])
    socketBonuses = socketBonuses.concat([721..752])
    for bonus in gear.bonuses
      if bonus in socketBonuses
        return true
    return false

  ###
  # View helpers
  ###

  updateDisplay: (skipUpdate) ->
    EnchantLookup = Shadowcraft.ServerData.ENCHANT_LOOKUP
    EnchantSlots = Shadowcraft.ServerData.ENCHANT_SLOTS
    Gems = Shadowcraft.ServerData.GEM_LOOKUP
    data = Shadowcraft.Data
    opt = {}

    for slotSet, ssi in SLOT_DISPLAY_ORDER
      buffer = ""
      for i, slotIndex in slotSet
        data.gear[i] ||= {}
        gear = data.gear[i]
        item = getItem(gear.id, gear.context)
        gems = []
        bonuses = null
        enchant = EnchantLookup[gear.enchant]
        enchantable = null
        upgradable = null
        bonusable = null
        if item
          item.sockets ||= []
          enchantable = gear.id not in ShadowcraftGear.ARTIFACTS && EnchantSlots[item.equip_location]? && getApplicableEnchants(i, item).length > 0

          bonus_keys = _.keys(Shadowcraft.ServerData.ITEM_BONUSES)
          bonuses_equipped = []
          if item.sockets and item.sockets.length > 0
            for socketIndex in [item.sockets.length-1..0]
              if item.sockets[socketIndex] == "Prismatic"
                item.sockets.pop()
          if gear.bonuses?
            for bonus in gear.bonuses
              bonuses_equipped.push bonus
              if _.contains(bonus_keys, bonus+"")
                applyBonusToItem(item, bonus, i) # here happens all the magic
          if item.chance_bonus_lists?
            for bonusId in item.chance_bonus_lists
              continue if not bonusId?
              break if bonusable
              for bonus_entry in Shadowcraft.ServerData.ITEM_BONUSES[bonusId]
                switch bonus_entry.type
                  when 6 # cool extra sockets
                    bonusable = true
                    break
                  when 2
                    bonusable = true
                    break
          allSlotsMatch = item.sockets && item.sockets.length > 0
          for socket,index in item.sockets
            if (gear.gems?)
              gem = Gems[gear.gems[index]]
              gems[gems.length] = {socket: socket, gem: gem}
              continue if socket == "Prismatic" # prismatic sockets don't contribute to socket bonus
              if !gem or !gem[socket]
                allSlotsMatch = false

          if allSlotsMatch
            bonuses = []
            for stat, amt of item.socketbonus
              bonuses[bonuses.length] = {stat: titleize(stat), amount: amt}

          if enchant and !enchant.desc
            enchant.desc = statsToDesc(enchant)

          if item.upgradable
            curr_level = "0"
            curr_level = gear.upgrade_level.toString() if gear.upgrade_level?
            max_level = getMaxUpgradeLevel(item)
            upgrade =
              curr_level: curr_level
              max_level: max_level
        if enchant and enchant.desc == ""
          enchant.desc = enchant.name
        ttgems = gear.gems.join(":")

        opt = {}
        opt.item = item
        opt.identifier = item.id + ":" + item.ilvl + ":" + (item.suffix || 0) if item
        opt.ttid = item.id if item
        opt.ttrand = if item then item.suffix else null
        opt.ttupgd = if item then item.upgrade_level else null
        opt.ttbonus = if bonuses_equipped then bonuses_equipped.join(":") else null
        opt.ttgems = if ttgems != "0:0:0" then ttgems else null
        opt.ep = if item then getEP(item, i).toFixed(1) else 0
        opt.slot = i + ''
        opt.socketbonus = bonuses
        opt.bonusable = true # TODO
        opt.enchantable = enchantable
        opt.enchant = enchant
        opt.upgradable = if item then item.upgradable else false
        opt.upgrade = upgrade
        opt.bonusable = bonusable

        if item and item.id not in ShadowcraftGear.ARTIFACTS
          opt.sockets = item.sockets
          opt.gems = gems
        else
          opt.sockets = null
          opt.gems = null

        if item
          opt.lock = true
          if gear.locked
            opt.lock_class = "lock_on"
          else
            opt.lock_class = "lock_off"
        buffer += Templates.itemSlot(opt)

      $slots.get(ssi).innerHTML = buffer
    this.updateStatsWindow()
    this.updateSummaryWindow()
    checkForWarnings('gear')

  # Returns the current total EP summed from all of the gear, gems, and enchants.
  getEPTotal: ->
    this.sumStats()
    keys = _.keys(@statSum).sort()
    total = 0
    for idx, stat of keys
      weight = getStatWeight(stat, @statSum[stat], null, true)
      total += weight
    return total

  # Updates the display of the Summary section of the Gear tab.
  updateSummaryWindow: ->
    data = Shadowcraft.Data
    $summary = $("#summary .inner")
    a_stats = []
    if data.options.general.patch
      if data.options.general.patch == 60
        valengine = "6.2"
      else
        valengine = data.options.general.patch / 10
    else
      valengine = "6.x"
    a_stats.push {
      name: "Engine"
      val: valengine
    }
    a_stats.push {
      name: "Spec"
      val: ShadowcraftTalents.GetActiveSpecName() || "n/a"
    }
    a_stats.push {
      name: "Boss Adds"
      val: if data.options.general.num_boss_adds? and (data.options.general.num_boss_adds > 0) then Math.min(4, data.options.general.num_boss_adds) else "0"
    }
    if ShadowcraftTalents.GetActiveSpecName() == "Combat"
      a_stats.push {
        name: "Blade Flurry"
        val: if data.options.rotation.blade_flurry then "ON" else "OFF"
      }
    else if ShadowcraftTalents.GetActiveSpecName() == "Subtlety"
      a_stats.push {
        name: "CP Builder"
        val:
          switch data.options.rotation.use_hemorrhage
            when "never" then "Backstab"
            when "always" then "Hemorrhage"
            when "uptime" then "Backstab w/ Hemo"
      }
    if data.options.general.lethal_poison
      a_stats.push {
        name: "Poison"
        val:
          switch data.options.general.lethal_poison
            when "wp" then "Wound"
            when "dp" then "Deadly"
      }
    $summary.get(0).innerHTML = Templates.stats {stats: a_stats}

  # Updates the display of the Gear Stats section of the Gear tab.
  updateStatsWindow: ->
    this.sumStats()
    $stats = $("#stats .inner")
    a_stats = []
    keys = _.keys(@statSum).sort()
    total = 0
    for idx, stat of keys
      weight = getStatWeight(stat, @statSum[stat], null, true)
      total += weight
      a_stats.push {
        name: titleize(stat),
        val: @statSum[stat],
        # ep: Math.floor(weight)
      }

    EP_TOTAL = total
    $stats.get(0).innerHTML = Templates.stats {stats: a_stats}

  # Updates the display of the Stat Weights section on the gear tab with
  # information from the last calculation pass.
  updateStatWeights = (source) ->
    Weights.agility = source.ep.agi
    Weights.crit = source.ep.crit
    Weights.strength = source.ep.str
    Weights.mastery = source.ep.mastery
    Weights.haste = source.ep.haste
    Weights.multistrike = source.ep.multistrike
    Weights.versatility = source.ep.versatility

    other =
      mainhand_dps: Shadowcraft.lastCalculation.mh_ep.mh_dps
      offhand_dps: Shadowcraft.lastCalculation.oh_ep.oh_dps
      t18_2pc: source.other_ep.rogue_t18_2pc || 0
      t18_4pc: source.other_ep.rogue_t18_4pc || 0
      t18_4pc_lfr: source.other_ep.rogue_t18_4pc_lfr || 0
      t19_2pc: source.other_ep.rogue_t19_2pc || 0
      t19_4pc: source.other_ep.rogue_t19_4pc || 0
      orderhall_8pc: source.other_ep.rogue_orderhall_8pc || 0

    all = _.extend(Weights, other)

    $weights = $("#weights .inner")
    $weights.empty()
    for key, weight of all
      continue if isNaN weight
      continue if weight == 0
      exist = $(".stat#weight_" + key)
      if exist.length > 0
        exist.find("val").text weight.toFixed(3)
      else
        $weights.append("<div class='stat' id='weight_#{key}'><span class='key'>#{titleize(key)}</span><span class='val'>#{Weights[key].toFixed(3)}</span></div>")
        exist = $(".stat#weight_" + key)
        $.data(exist.get(0), "sortkey", 0)
        if key in ["mainhand_dps","offhand_dps"]
          $.data(exist.get(0), "sortkey", 1)
        else if key in ["t18_2pc","t18_4pc","t18_4pc_lfr","t19_2pc","t19_4pc","rogue_orderhall_8pc"]
          $.data(exist.get(0), "sortkey", 2)
      $.data(exist.get(0), "weight", weight)

    $("#weights .stat").sortElements (a, b) ->
      as = $.data(a, "sortkey")
      bs = $.data(b, "sortkey")
      if as != bs
        return if as > bs then 1 else -1
      else
        if $.data(a, "weight") > $.data(b, "weight") then -1 else 1
    epSort(Shadowcraft.ServerData.GEMS)

  # Updates the engine info section of the Advanced tab with information
  # from the last calculation pass.
  updateEngineInfoWindow = ->
    return unless Shadowcraft.lastCalculation.engine_info?
    engine_info = Shadowcraft.lastCalculation.engine_info
    $summary = $("#engineinfo .inner")
    data = []
    for name, val of engine_info
      data.push {
        name: titleize name
        val: val
      }
    $summary.get(0).innerHTML = Templates.stats {stats: data}

  # Updates the dps breakdown section of the Advanced tab with information
  # from the last calculation pass.
  updateDpsBreakdown = ->
    dps_breakdown = Shadowcraft.lastCalculation.breakdown
    total_dps = Shadowcraft.lastCalculation.total_dps
    max = null
    buffer = ""
    target = $("#dpsbreakdown .inner")
    rankings = _.extend({}, dps_breakdown)
    max = _.max(rankings)
    $("#dpsbreakdown .talent_contribution").hide()
    for skill, val of dps_breakdown
      skill = skill.replace('(','').replace(')','').split(' ').join('_')
      val = parseFloat(val)
      name = titleize(skill)
      skill = skill.replace(/\./g,'_')
      exist = $("#dpsbreakdown #talent-weight-" + skill)
      if isNaN(val)
        name += " (NYI)"
        val = 0
      pct = val / max * 100 + 0.01
      pct_dps = val / total_dps * 100
      if exist.length == 0
        buffer = Templates.talentContribution({
          name: "#{name} (#{val.toFixed 1} DPS)",
          raw_name: skill,
          val: val.toFixed(1),
          width: pct
        })
        target.append(buffer)
      exist = $("#dpsbreakdown #talent-weight-" + skill)
      $.data(exist.get(0), "val", val)
      exist.show().find(".pct-inner").css({width: pct + "%"})
      exist.find(".label").text(pct_dps.toFixed(2) + "%")

    $("#dpsbreakdown .talent_contribution").sortElements (a, b) ->
      ad = $.data(a, "val")
      bd = $.data(b, "val")
      if ad > bd then -1 else 1

  # Creates a description of an item based on the stats (+x stat)
  statsToDesc = (obj) ->
    return obj.__statsToDesc if obj.__statsToDesc
    buff = []
    for stat of obj.stats
      buff[buff.length] = "+" + obj.stats[stat] + " " + titleize(stat)
    obj.__statsToDesc = buff.join("/")
    return obj.__statsToDesc

  # Performs some standard setup for any popup windows that are opened
  clickSlot = (slot, prop) ->
    $slot = $(slot).closest(".slot")
    $slots.find(".slot").removeClass("active")
    $slot.addClass("active")
    slotIndex = parseInt($slot.attr("data-slot"), 10)
    $.data(document.body, "selecting-slot", slotIndex)
    $.data(document.body, "selecting-prop", prop)
    return [$slot, slotIndex]

  # Gets an item from the item lookup table based on item ID and context.
  getItem = (itemId, context) ->
    if (itemId in ShadowcraftGear.ARTIFACTS)
      item = Shadowcraft.Data.artifact_items[itemId]
    else
      arm = [itemId, context]
      itemString = arm.join(':')
      item = Shadowcraft.ServerData.ITEM_BY_CONTEXT[itemString]
    if not item? and itemId
      console.warn "item not found by context", itemString
    return item

  getItem: (itemId, context) ->
    return getItem(itemId, context)

  getMaxUpgradeLevel = (item) ->
    return 2

  getUpgradeLevelSteps = (item) ->
    return 5

  needsDagger = ->
    Shadowcraft.Data.activeSpec == "a"

  # Called when a user clicks on the name in a slot. This opens a popup with
  # a list of items.
  clickSlotName = ->
    buf = clickSlot(this, "item_id")
    $slot = buf[0]
    slot = buf[1]
    selected_identifier = $slot.data("identifier")

    equip_location = SLOT_INVTYPES[slot]
    GemList = Shadowcraft.ServerData.GEMS

    gear = Shadowcraft.Data.gear

    requireDagger = needsDagger()
    subtletyNeedsDagger = Shadowcraft.Data.activeSpec == "b" && Shadowcraft.Data.options.rotation.use_hemorrhage in ['uptime','never']

    loc_all = Shadowcraft.ServerData.SLOT_CHOICES[equip_location]
    loc = []

    # Filter the list of items down to a specific subset. There are some extra
    # criteria for hiding items as well, beyond just simple slot numbers.
    for lid in loc_all
      l = ShadowcraftData.ITEM_LOOKUP2[lid]
      if lid == selected_identifier # always show equipped item
        loc.push l
        continue

      # Don't display all of the different versions of the legendary ring.
      continue if l.id == 124636

      # Filter weapons to only display the artifact for the current spec and the
      # correct hand.
      if slot == 15
        continue if Shadowcraft.Data.activeSpec == "a" and l.id != 128870
        continue if Shadowcraft.Data.activeSpec == "Z" and l.id != 128872
        continue if Shadowcraft.Data.activeSpec == "b" and l.id != 128476
      if slot == 16
        continue if Shadowcraft.Data.activeSpec == "a" and l.id != 128869
        continue if Shadowcraft.Data.activeSpec == "Z" and l.id != 134552
        continue if Shadowcraft.Data.activeSpec == "b" and l.id != 128479

      # Filter out items that are outside the min and max ilvls set on the options
      # panel
      continue if l.ilvl > Shadowcraft.Data.options.general.max_ilvl
      continue if l.ilvl < Shadowcraft.Data.options.general.min_ilvl
      continue if (slot == 15 || slot == 16) && requireDagger && l.subclass != 15
      continue if (slot == 15) && subtletyNeedsDagger && l.subclass != 15
      continue if l.upgrade_level != 0 and Shadowcraft.Data.options.general.show_upgrades == 0 and lid != selected_identifier
      continue if l.tag? and /Warforged$/.test(l.tag) and Shadowcraft.Data.options.general.show_warforged == 0 and lid != selected_identifier
      continue if l.upgrade_level != 0 and l.upgrade_level > getMaxUpgradeLevel(l)
      continue if l.suffix and Shadowcraft.Data.options.general.show_random_items > l.ilvl and lid != selected_identifier

      # prevent unique-equippable items from showing up when it's already equipped
      # in another slot. this is mostly trinkets (slots 12 and 13) or legendary
      # and pvp rings (slots 10 and 11)
      continue if slot == 12 && l.id == gear[13].id
      continue if slot == 13 && l.id == gear[12].id
      continue if slot == 10 && gear[11].id in LEGENDARY_RINGS && l.id in LEGENDARY_RINGS
      continue if slot == 11 && gear[10].id in LEGENDARY_RINGS && l.id in LEGENDARY_RINGS

      # For pvp rings, it's if a ring has a tag and the tag either ends with
      # Tournament or "Season #", and the tag matches the currently equipped one
      # in the other slot, and the item ID matches the one in the other slot.
      # Skip those items.
      # TODO: this may be broken and requires some testing from someone who
      # actually gives two shits about PVP to tell me that.
      continue if slot == 10 && l.tag? && (/Tournament$/.test(l.tag) || /Season [0-9]$/.test(l.tag)) && l.tag == gear[11].tag && l.name == gear[11].name
      continue if slot == 11 && l.tag? && (/Tournament$/.test(l.tag) || /Season [0-9]$/.test(l.tag)) && l.tag == gear[10].tag && l.name == gear[10].name
      loc.push l

    gear_offset = statOffset(gear[slot], FACETS.ITEM)
    gem_offset = statOffset(gear[slot], FACETS.GEMS)
    epSort(GemList) # Needed for gemming recommendations

    # set bonus
    setBonEP = {}
    for set_name, set of Sets
      setCount = getEquippedSetCount(set.ids, equip_location)
      setBonEP[set_name] ||= 0
      setBonEP[set_name] += setBonusEP(set, setCount)
    for l in loc
      # TODO variable might not be necessary anymore
      l.sockets ||= []
      l.__gemRec = getGemmingRecommendation(GemList, l, gem_offset)
      l.__setBonusEP = 0
      for set_name, set of Sets
        if set.ids.indexOf(l.id) >= 0
          l.__setBonusEP += setBonEP[set_name]

      l.__gearEP = getEP(l, slot, gear_offset)
      l.__gearEP = 0 if isNaN l.__gearEP
      l.__setBonusEP = 0 if isNaN l.__setBonusEP
      l.__ep = l.__gearEP + l.__gemRec.ep + l.__setBonusEP

    loc.sort(sortComparator)
    maxIEP = 1
    minIEP = 0
    buffer = ""

    for l in loc
      continue if l.__ep < 1
      unless isNaN l.__ep
        maxIEP = l.__ep if maxIEP <= 1
        minIEP = l.__ep

    maxIEP -= minIEP

    for l in loc
      continue if l.__ep < 1
      iEP = l.__ep

      ttid = l.id
      ttrand = if l.suffix? then l.suffix else ""
      ttupgd = if l.upgradable then l.upgrade_level else ""
      ttbonus = if l.bonus_tree? then l.bonus_tree.join(":") else ""
      if l.identifier == selected_identifier
        bonus_trees = gear[slot].bonuses
        ttbonus = bonus_trees.join(":")
      upgrade = []
      if l.upgradable
        curr_level = "0"
        curr_level = l.upgrade_level.toString() if l.upgrade_level?
        max_level = getMaxUpgradeLevel(l)
        upgrade =
          curr_level: curr_level
          max_level: max_level
      buffer += Templates.itemSlot(
        item: l
        identifier: l.id + ":" + l.ilvl + ":" + (l.suffix || 0)
        gear: {}
        gems: []
        upgradable: l.upgradable
        upgrade: upgrade
        ttid: ttid
        ttrand: ttrand
        ttupgd: ttupgd
        ttbonus: ttbonus
        desc: "#{l.__gearEP.toFixed(1)} base / #{l.__gemRec.ep.toFixed(1)} gem #{if l.__setBonusEP > 0 then "/ "+ l.__setBonusEP.toFixed(1) + " set" else ""} "
        search: escape(l.name + " " + l.tag)
        percent: Math.max (iEP - minIEP) / maxIEP * 100, 0.01
        ep: iEP.toFixed(1)
      )

    buffer += Templates.itemSlot(
      item: {name: "[No item]"}
      desc: "Clear this slot"
      percent: 0
      ep: 0
    )

    $popupbody.get(0).innerHTML = buffer
    $popupbody.find(".slot[data-identifier='#{selected_identifier}']").addClass("active")
    showPopup($popup)
    false

  # Called when a user clicks on an enchant section in an item. This opens a
  # popup with a list of applicable enchants for the item.
  clickSlotEnchant = ->
    data = Shadowcraft.Data
    EnchantSlots = Shadowcraft.ServerData.ENCHANT_SLOTS

    buf = clickSlot(this, "enchant")
    slot = buf[1]
    equip_location = SLOT_INVTYPES[slot]

    enchants = EnchantSlots[equip_location]
    max = 0

    gear = Shadowcraft.Data.gear[slot]
    offset = statOffset(gear, FACETS.ENCHANT)
    item = getItem(gear.id, gear.context)
    for enchant in enchants
      enchant.__ep = getEP(enchant, slot, offset)
      enchant.__ep = 0 if isNaN enchant.__ep
      max = if enchant.__ep > max then enchant.__ep else max
    enchants.sort(sortComparator)
    selected_id = data.gear[slot].enchant
    buffer = ""

    for enchant in enchants
      # do not show enchant if item level is higher than allowed maximum
      continue if enchant.requires?.max_item_level? and enchant.requires?.max_item_level < getBaseItemLevel(item)
      enchant.desc = statsToDesc(enchant) if enchant && !enchant.desc
      enchant.desc = enchant.name if enchant and enchant.desc == ""
      eEP = enchant.__ep
      continue if eEP < 1
      buffer += Templates.itemSlot(
        item: enchant
        percent: eEP / max * 100
        ep: eEP.toFixed(1)
        search: escape(enchant.name + " " + enchant.desc)
        desc: enchant.desc
        ttid: enchant.tooltip_spell
      )

    buffer += Templates.itemSlot(
      item: {name: "[No enchant]"}
      desc: "Clear this enchant"
      percent: 0
      ep: 0
    )

    $popupbody.get(0).innerHTML = buffer
    $popupbody.find(".slot[id='#{selected_id}']").addClass("active")
    showPopup($popup)
    false

  # Gets the base item level of an item before all upgrades
  getBaseItemLevel = (item) ->
    unless item.upgrade_level
      return item.ilvl
    return item.ilvl - getUpgradeLevelSteps(item) * item.upgrade_level

  # Called when a user clicks on a gem section in an item. This opens a
  # popup with a list of applicable gems for the item.
  clickSlotGem = ->
    ItemLookup = Shadowcraft.ServerData.ITEM_LOOKUP2
    GemList = Shadowcraft.ServerData.GEMS
    data = Shadowcraft.Data

    buf = clickSlot(this, "gem")
    $slot = buf[0]
    slot = buf[1]
    item = ItemLookup[$slot.data("identifier")]
    gemSlot = $slot.find(".gem").index(this)
    $.data(document.body, "gem-slot", gemSlot)
    gemType = item.sockets[gemSlot]
    selected_id = data.gear[slot].gems[gemSlot]

    otherGearGems = []
    for i in [0..2]
      continue if i == gemSlot
      if data.gear[slot].gems[i]
        otherGearGems.push data.gear[slot].gems[i]

    for gem in GemList
      gem.__ep = getEP(gem)
    GemList.sort(sortComparator)

    buffer = ""
    usedNames = {}
    max = null
    for gem in GemList
      if usedNames[gem.name]
        if gem.id == selected_id
          selected_id = usedNames[gem.name]
        continue

      usedNames[gem.name] = gem.id
      continue if gem.name.indexOf("Perfect") == 0 and selected_id != gem.id
      continue unless canUseGem(gem, gemType)
      continue if gem.name.indexOf('Taladite') >= 0 and item? and item.quality == 7 and item.ilvl <= 620 # do not recommend wod gems to heirlooms
      continue if gem.name.indexOf('Taladite') >= 0 and item? and item.id in [98148,102248] and item.ilvl <= 616 # do not recommend wod gems for legendary cloak
      max ||= gem.__ep
      gEP = gem.__ep
      desc = statsToDesc(gem)

      continue if gEP < 1

      buffer += Templates.itemSlot
        item: gem
        ep: gEP.toFixed(1)
        gear: {}
        ttid: gem.id
        search: escape(gem.name + " " + statsToDesc(gem) + " " + gem.slot)
        percent: gEP / max * 100
        desc: desc

    buffer += Templates.itemSlot(
      item: {name: "[No gem]"}
      desc: "Clear this gem"
      percent: 0
      ep: 0
    )

    $popupbody.get(0).innerHTML = buffer
    $popupbody.find(".slot[id='" + selected_id + "']").addClass("active")
    showPopup($popup)
    false

  # Called when a user clicks on the bonuses section in an item. This opens a
  # popup with a set of checkboxes to allow a user to add bonuses (tertiary
  # stats, sockets).
  clickSlotBonuses = ->
    clickSlot(this, "bonuses")
    $(".slot").removeClass("active")
    $(this).addClass("active")
    data = Shadowcraft.Data

    $slot = $(this).closest(".slot")
    slot = parseInt($slot.data("slot"), 10)
    $.data(document.body, "selecting-slot", slot)

    identifier = $slot.data("identifier")
    item = Shadowcraft.ServerData.ITEM_LOOKUP2[identifier]

    gear = data.gear[slot]
    currentBonuses = gear.bonuses
    # TODO build all possible bonuses with status selected or not, etc.
    groups = {
      suffixes: []
      tertiary: []
      sockets: []
      titanforged: []
    }
    for bonusId in item.chance_bonus_lists
      group = {}
      group['bonusId'] = bonusId
      group['active'] = true if _.contains(currentBonuses, bonusId)
      group['entries'] = []
      group.ep = 0
      subgroup = null
      for bonus_entry in Shadowcraft.ServerData.ITEM_BONUSES[bonusId]
        entry = {
          'type': bonus_entry.type
          'val1': bonus_entry.val1
          'val2': bonus_entry.val2
        }
        switch bonus_entry.type
          when 6 # cool extra sockets
            group['entries'].push entry
            gem = getBestNormalGem
            group.ep += getEP(gem)
            subgroup = "sockets"
          when 5 # item name suffix
            group['entries'].push entry
            subgroup = "suffixes"
          when 2 # awesome extra stats
            entry['val2'] = Math.round(bonus_entry.val2 / 10000 * Shadowcraft.ServerData.RAND_PROP_POINTS[item.ilvl][1 + getRandPropRow(slot)])
            entry['val1'] = bonus_entry.val1
            group['entries'].push entry
            group.ep += getStatWeight(entry.val1, entry.val2)
            subgroup = "tertiary" unless subgroup?
          when 1 # item level increases
            if (bonusId >= 1477 and bonusId <= 1672)
              ilvl_bonus = entry['val1']
              entry['val1'] = "+"+ilvl_bonus+" Item Levels "
              if ilvl_bonus < 15
                entry['val1'] += "(Warforged)"
              else
                entry['val1'] += "(Titanforged)"
              entry['val2'] = "Item Level " + (item.ilvl+ilvl_bonus)
              group['entries'].push entry
              group.ep = 0 # TODO calculate this based on the item
              subgroup = "titanforged"
      if subgroup?
        group.ep = group.ep.toFixed(2)
        groups[subgroup].push group
        groups[subgroup+"_active"] = true

    for key,subgroup of groups
      continue unless _.isArray(subgroup)
      subgroup.sort (a, b) ->
        b.ep - a.ep
    $.data(document.body, "bonuses-item", item)
    $("#bonuses").html Templates.bonuses
      groups: groups
    Shadowcraft.setupLabels("#bonuses")
    showPopup $("#bonuses.popup")
    false

  # Called when a user clicks on the wowhead icon in an item. This cancels the
  # event to allow the URL clicked to open.
  clickWowhead = (e) ->
    e.stopPropagation()
    true

  # Called when a user clicks on the upgrade arrow in an item.
  clickItemUpgrade = (e) ->
    e.stopPropagation()
    buf = clickSlot(this, "item_id")
    slot = buf[1]

    data = Shadowcraft.Data

    gear = data.gear[slot]
    item = getItem(gear.id, gear.context)
    max = getMaxUpgradeLevel(item)
    if (gear.upgrade_level == max)
      gear.item_level -= getUpgradeLevelSteps(item) * max
      gear.upgrade_level = 0
    else
      gear.item_level += getUpgradeLevelSteps(item)
      gear.upgrade_level += 1
    Shadowcraft.update()
    Shadowcraft.Gear.updateDisplay()
    true

  # Called when a user clicks on the lock icon for an item.
  clickItemLock = (e) ->
    e.stopPropagation()
    buf = clickSlot(this, "item_id")
    slot = buf[1]

    data = Shadowcraft.Data

    gear = data.gear[slot]
    gear.locked ||= false
    data.gear[slot].locked = not gear.locked
    item = getItem(gear.id, gear.context)
    if item
      if data.gear[slot].locked
        Shadowcraft.Console.log("Locking " + item.name + " for Optimize Gems")
      else
        Shadowcraft.Console.log("Unlocking " + item.name + " for Optimize Gems")
    Shadowcraft.Gear.updateDisplay()
    true

  boot: ->
    app = this
    $slots = $(".slots")
    $popup = $("#gearpopup")
    $popupbody = $("#gearpopup .body")

    # Register for the recompute event sent by the backend. This updates some
    # of the display with the latest information from the last calculation pass.
    Shadowcraft.Backend.bind("recompute", updateStatWeights)
    Shadowcraft.Backend.bind("recompute", -> Shadowcraft.Gear )
    Shadowcraft.Backend.bind("recompute", updateDpsBreakdown)
    Shadowcraft.Backend.bind("recompute", updateEngineInfoWindow)

    Shadowcraft.Talents.bind "changed", ->
      app.updateStatsWindow()
      app.updateSummaryWindow()

    Shadowcraft.bind "loadData", ->
      app.updateDisplay()

    $("#optimizeGems").click ->
      window._gaq.push ['_trackEvent', "Character", "Optimize Gems"] if window._gaq
      Shadowcraft.Gear.optimizeGems()

    $("#optimizeEnchants").click ->
      window._gaq.push ['_trackEvent', "Character", "Optimize Enchants"] if window._gaq
      Shadowcraft.Gear.optimizeEnchants()

    $("#lockAll").click ->
      window._gaq.push ['_trackEvent', "Character", "Lock All"] if window._gaq
      Shadowcraft.Gear.lockAll()

    $("#unlockAll").click ->
      window._gaq.push ['_trackEvent', "Character", "Unlock All"] if window._gaq
      Shadowcraft.Gear.unlockAll()

    # Initialize UI handlers
    $("#bonuses").click $.delegate
      ".label_check input"  : ->
        $this = $(this)
        $this.attr("checked", not $this.attr("checked")?)
        Shadowcraft.setupLabels("#bonuses")
      ".applyBonuses" : this.applyBonuses
      ".clearBonuses" : clearBonuses

    # Register the callback handlers for all of the various parts of each item
    # on the UI.
    $slots.click $.delegate
      ".upgrade" : clickItemUpgrade
      ".lock"    : clickItemLock
      ".wowhead" : clickWowhead
      ".name"    : clickSlotName
      ".enchant" : clickSlotEnchant
      ".gem"     : clickSlotGem
      ".bonuses" : clickSlotBonuses

    $(".slots, .popup").mouseover($.delegate
      ".tt": ttlib.requestTooltip
    ).mouseout($.delegate
      ".tt": ttlib.hide
    )

    $(".popup .body").bind "mousewheel", (event) ->
      if (event.wheelDelta < 0 and this.scrollTop + this.clientHeight >= this.scrollHeight) or event.wheelDelta > 0 and this.scrollTop == 0
        event.preventDefault()
        return false

    $("#gear .slots").mousemove (e) ->
      $.data document, "mouse-x", e.pageX
      $.data document, "mouse-y", e.pageY

    # Register a callback for when a user clicks on an item in one of the
    # popup windows.
    $popupbody.click $.delegate
      ".slot" : (e) ->
        Shadowcraft.Console.purgeOld()
        ItemLookup = Shadowcraft.ServerData.ITEM_LOOKUP2
        EnchantLookup = Shadowcraft.ServerData.ENCHANT_LOOKUP
        Gems = Shadowcraft.ServerData.GEM_LOOKUP
        data = Shadowcraft.Data

        slot = $.data(document.body, "selecting-slot")
        update = $.data(document.body, "selecting-prop")
        $this = $(this)
        slotGear = data.gear[slot]

        if update == "item_id" || update == "enchant"
          val = parseInt($this.attr("id"), 10)
          identifier = $this.data("identifier")
          slotGear[update] = if val != 0 then val else null
          if update == "item_id"
            item = ItemLookup[identifier]
            if item
              slotGear.id = item.id
              slotGear.item_level = item.ilvl
              slotGear.name = item.name
              slotGear.context = item.context ? null
              slotGear.tag = item.tag ? null
              slotGear.suffix = item.suffix ? null
              slotGear.upgrade_level = item.upgrade_level ? null
              if item.sockets
                socketlength = item.sockets.length
                for i in [0..2]
                  if i >= socketlength
                    slotGear.gems[i] = null
                  else if slotGear.gems[i]?
                    gem = Gems[slotGear.gems[i]]
                    if gem
                      if not canUseGem Gems[slotGear.gems[i]], item.sockets[i], [], slot
                        slotGear.gems[i] = null
              if item.bonus_tree
                slotGear.bonuses = item.bonus_tree
              if (item.id in ShadowcraftGear.ARTIFACTS)
                Shadowcraft.Artifact.updateArtifactItem(item.id, item.ilvl, item.ilvl)
            else
              slotGear.id = null
              slotGear.item_level = null
              slotGear.gems[i] = null for i in [0..2]
              slotGear.bonuses[i] = null for i in [0..9]
              slotGear.suffix = null
          else
            enchant_id = if not isNaN(val) then val else null
            item = getItem(slotGear.id, slotGear.context)
            if enchant_id?
              Shadowcraft.Console.log("Changing " + item.name + " enchant to " + EnchantLookup[enchant_id].name)
            else
              Shadowcraft.Console.log("Removing Enchant from " + item.name)
        else if update == "gem"
          item_id = parseInt($this.attr("id"), 10)
          item_id = if not isNaN(item_id) then item_id else null
          gem_id = $.data(document.body, "gem-slot")
          item = getItem(slotGear.id, slotGear.context)
          if item_id?
            Shadowcraft.Console.log("Regemming " + item.name + " socket " + (gem_id + 1) + " to " + Gems[item_id].name)
          else
            Shadowcraft.Console.log("Removing Gem from " + item.name + " socket " + (gem_id + 1))
          slotGear.gems[gem_id] = item_id
        Shadowcraft.update()
        app.updateDisplay()

    # Register a bunch of key bindings for the popup windows so that a user
    # can move up and down in the list with the keyboard, plus select items
    # with the enter key.
    $("input.search").keydown((e) ->
      $this = $(this)
      $popup = $this.closest(".popup")
      switch e.keyCode
        when 27 #  Esc
          $this.val("").blur().keyup()
          e.cancelBubble = true
          e.stopPropagation()
        when 38 #  Up arrow
          slots = $popup.find(".slot:visible")
          for slot, i in slots
            if slot.className.indexOf("active") != -1
              if slots[i-1]?
                next = $(slots[i-1])
                break
              else
                next = $popup.find(".slot:visible").last()
                break
        when 40 # Down arrow
          slots = $popup.find(".slot:visible")
          for slot, i in slots
            if slot.className.indexOf("active") != -1
              if slots[i+1]?
                next = $(slots[i+1])
                break
              else
                next = $popup.find(".slot:visible").first()
                break
        when 13 # Enter
          $popup.find(".active").click()
          return

      if next
        $popup.find(".slot").removeClass("active")
        next.addClass("active")
        ot = next.get(0).offsetTop
        height = $popup.height()
        body = $popup.find(".body")

        if ot > body.scrollTop() + height - 30
          body.animate({scrollTop: next.get(0).offsetTop - height + next.height() + 30}, 150)
        else if ot < body.scrollTop()
          body.animate({scrollTop: next.get(0).offsetTop - 30}, 150)
    ).keyup( (e) ->
      $this = $(this)
      popup = $this.parents(".popup")
      search = $.trim($this.val().toLowerCase())
      all = popup.find(".slot:not(.active)")
      show = all.filter(":regex(data-search, " + escape(search) + ")")
      hide = all.not(show)
      show.removeClass("hidden")
      hide.addClass("hidden")
    )

    # On escape, clear popups
    reset = ->
      $(".popup:visible").removeClass("visible")
      ttlib.hide()
      $slots.find(".active").removeClass("active")

    $("body").click(reset).keydown (e) ->
      if e.keyCode == 27
        reset()

    $("#filter, #bonuses").click (e) ->
      e.cancelBubble = true
      e.stopPropagation()

    # Bind to the update event from the Options tab for changes that affect the
    # Gear tab.
    Shadowcraft.Options.bind "update", (opt, val) ->
      if opt in ['rotation.use_hemorrhage']
        app.updateDisplay()
      if opt in ['rotation.blade_flurry','general.num_boss_adds','general.lethal_poison']
        app.updateSummaryWindow()

    this.updateDisplay()

    checkForWarnings('options')
    @initialized = true

    this

  constructor: (@app) ->
