# coding: utf-8
require 'hmac-sha1'
require 'digest/sha1'
require 'base64'

module WowArmory
  class CurlException < Exception
    attr_accessor :error
    def initialize(msg, error)
      super(msg)
      self.error = error
    end
  end
  class MissingDocument < CurlException; end
  class ArmoryError < CurlException; end

  module Document
    unloadable
    def self.fetch(region, resource, params, parse = :json)
      host = case parse
      when :json
        case region.downcase
          when 'us'
            'us.api.battle.net'
          when 'eu'
            'eu.api.battle.net'
          when 'kr'
            'kr.api.battle.net'
          when 'tw'
            'tw.api.battle.net'
          when 'cn'
            'www.api.battlenet.com.cn'
          when 'sea'
            'sea.api.battle.net'
          else
            'us.api.battle.net'
        end
      when :xml, false
        case region.downcase
          when 'us'
            'us.battle.net/wow/en'
          when 'eu'
            'eu.battle.net/wow/en'
          when 'kr'
            'kr.battle.net/wow/ko'
          when 'tw'
            'tw.battle.net/wow/zh'
          when 'cn'
            'cn.battle.net/wow/zh'
          when 'sea'
            'sea.battle.net/wow/sea'
          else
            'us.battle.net/wow/en'
        end
      end

      params[:apikey] = BLIZZARD_CREDENTIALS['apikey']
      url = 'https://' + host + resource + '?' + params.to_query
      tries = 0
      begin
        result = Curl::Easy.http_get(url) do |curl|
          curl.timeout = 7
          curl.headers['User-Agent'] = 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US) AppleWebKit/525.13 (KHTML, like Gecko) Chrome/0.A.B.C Safari/525.13'
          #sign_request('GET', curl)
        end
        if result.response_code >= 400 and result.response_code < 500
          raise MissingDocument.new "Armory returned #{result.response_code}", result.response_code
        elsif result.response_code >= 500
          raise ArmoryError.new "Armory returned #{result.response_code}", result.response_code
        end
		
        @content = result.body_str
        if parse == :xml
          @document = Nokogiri::HTML @content
        elsif parse == :json
          @json = JSON::load @content
          if @json.blank?
            raise ArmoryError.new 'Armory returned empty data', 404
          end
          return @json
        else
          @content
        end
        
      rescue Curl::Err::TimeoutError, Curl::Err::ConnectionFailedError, JSON::ParserError => e
        if tries < 3
          tries += 1
          retry
        else
          raise e
        end
      end
    end

    def self.sign_request(verb, curl)
      return if BLIZZARD_CREDENTIALS['public'].nil?
      path = URI.parse(curl.url).path
      curl.headers['Date'] = Time.now.gmtime.rfc2822.gsub('-0000', 'GMT')
      string_to_sign = "%s\n%s\n%s\n" % [verb, curl.headers['Date'], path]
      signature = Base64.encode64(HMAC::SHA1.digest(BLIZZARD_CREDENTIALS['private'], string_to_sign)).strip
      curl.headers['Authorization'] = 'BNET %s:%s' % [BLIZZARD_CREDENTIALS['public'], signature]
    end

    def normalize_realm(realm)
      realm.downcase.gsub(/['’]/, '').gsub(/ /, '-').gsub(/[àáâãäå]/, 'a').gsub(/[ö]/, 'o')
    end

    def normalize_character(character)
      character.downcase
    end

    def nodes(path, set = nil)
      if set.nil?
        @document.css(path)
      elsif set.is_a? Array
        set.map {|s| s.css(path)}.flatten
      else
        set.css(path)
      end
    end

    def value(path, set = nil)
      n = nodes(path, set).first
      return nil if n.nil?
      n.text.strip
    end

    def attr(path, attribute, set = nil)
      n = nodes(path, set).first
      return nil if n.nil?
      n.attr(attribute)
    end
  end
end
