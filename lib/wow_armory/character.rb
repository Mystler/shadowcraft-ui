module WowArmory
  class Character
    unloadable

    @@item_enchants = nil

    include Constants
    include Document

    attr_accessor :realm, :region, :name, :active, :gear, :race, :level, :player_class, :talents, :portrait

    def initialize(character, realm, region = 'US')
      @character = character
      @realm = realm
      @region = region
      params = {
          :fields => 'talents,items'
      }
      @json = WowArmory::Document.fetch region, '/wow/character/%s/%s' % [normalize_realm(realm), normalize_character(character)], params

      populate!

      @json['talents'].each_with_index do |tree, index|
        self.active = index if tree['selected']
      end
    end

    def gear
      @gear
    end

    def as_json(options = {})
      {
        :gear => gear,
        :race => race,
        :level => level,
        :active => active,
        :player_class => player_class,
        :talents => self.talents.map do |tree|
          {:spec => tree['calcSpec'], :talents => tree['calcTalent']}
        end,
      }
    end

    private

    def populate!
      self.name = @json['name']
      self.level = @json['level'].to_i
      self.realm = @json['realm'].to_i
      self.player_class = CLASS_MAP[@json['class'].to_i] || 'unknown'
      self.race = RACE_MAP[@json['race'].to_i]

      # For talents, make sure to ignore any blank specs. Druids will actually have 4 specs
      # filled in, but rogues will return three good specs and one with a blank calcSpec
      # field.
      self.talents = @json['talents'].reject{|x| x['calcSpec'] == ""}

      self.portrait = 'http://%s.battle.net/static-render/%s/%s' % [ @region.downcase, @region.downcase, @json['thumbnail'] ]

      populate_gear
    end

    def populate_gear
      @gear = {}
      raise ArmoryError.new('No items found on character', 500) if @json['items'].nil?
      @json['items'].each do |k, v|
        next unless v.is_a? Hash
        next if SLOT_MAP[k].nil?

        tooltip = v['tooltipParams'] || {}
        info = {
          'id' => v['id'],
          'item_level' => v['itemLevel'],
          'enchant' => tooltip['enchant'].nil? ? 0 : tooltip['enchant'],
          'gems' => [],
          'slot' => SLOT_MAP[k],
          'bonuses' => v['bonusLists'],
          'context' => v['context']
        }
        info['gems'].push(tooltip['gem0'].nil? ? 0 : tooltip['gem0'])
        info['gems'].push(tooltip['gem1'].nil? ? 0 : tooltip['gem1'])
        info['gems'].push(tooltip['gem2'].nil? ? 0 : tooltip['gem2'])

        info['suffix'] = tooltip['suffix'].to_i unless tooltip['suffix'].blank?
        unless tooltip['upgrade'].nil?
          upgrade = tooltip['upgrade']
          info['upgrade_level'] = upgrade['current'] if upgrade['current'] > 0
        end

        if info['context'].start_with?('world-quest-')
          info['context'] = 'world-quest'
        end

        @gear[info['slot'].to_s] = info
      end
      Rails.logger.debug @gear

      @gear["13"] = {
        'id' => 137367,
        'item_level' => 820,
        'enchant' => 0,
        'gems' => [0,0,0],
        'slot' => 13,
        'bonuses' => [41],
        'context' => 'world-quest',
        'upgrade_level' => 0}
    end
  end
end
