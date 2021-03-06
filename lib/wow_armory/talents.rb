# This is dead-simple code to load talent data from the armory following
# the model of the other data types.
module WowArmory
  class Talents
    unloadable

    include Constants
    include Document

    attr_accessor :talents

    def initialize(region = 'US')

      # Clear out everything that we have already
      self.talents = {'a': [], 'Z': [], 'b': []}

      @json = WowArmory::Document.fetch region, '/wow/data/talents', {}

      # Parse the json from the API
      @json['4']['talents'].each do |tier|
        tier.each do |column|
          a = nil
          z = nil
          b = nil
          nospec = nil

          # Loop through each column, looking to see if we have special talents
          # for any of the specs. Also store off the talent that has no spec
          # associated with it.
          column.each do |talent|

            if !talent.key?('spec')
              nospec = {'tier' => talent['tier'], 'column' => talent['column'], 'spell' => talent['spell']['id'],
                'name' => talent['spell']['name'], 'icon' => talent['spell']['icon']}
            else
              if talent['spec']['name'] == 'Assassination'
                a = {'tier' => talent['tier'], 'column' => talent['column'], 'spell' => talent['spell']['id'],
                  'name' => talent['spell']['name'], 'icon' => talent['spell']['icon']}
              elsif talent['spec']['name'] == 'Outlaw'
                z = {'tier' => talent['tier'], 'column' => talent['column'], 'spell' => talent['spell']['id'],
                  'name' => talent['spell']['name'], 'icon' => talent['spell']['icon']}
              elsif talent['spec']['name'] == 'Subtlety'
                b = {'tier' => talent['tier'], 'column' => talent['column'], 'spell' => talent['spell']['id'],
                  'name' => talent['spell']['name'], 'icon' => talent['spell']['icon']}
              end
            end
          end

          if (a.nil?)
            talents[:a] << nospec
          else
            talents[:a] << a
          end

          if (z.nil?)
            talents[:Z] << nospec
          else
            talents[:Z] << z
          end

          if (b.nil?)
            talents[:b] << nospec
          else
            talents[:b] << b
          end
        end
      end
    end

    def as_json(options = {})
      {
        :talents => talents
      }
    end
  end
end
