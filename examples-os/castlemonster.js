/*
 * CastleMonsters engine.
 *
 * Copyright (c) 2011 UnitPoint <support@unitpoint.ru>
 * Author: Evgeniy Golovin <evgeniy.golovin@unitpoint.ru>
 *
 */

window['cm'] = window['CastleMonsters'] = (function(){
	var cm = {

		Point: CAAT.Point,

		use_map_shape_debug: false,
		use_physics_debug: false,
		use_path_debug: true,
		use_monsters_battle: false,
		// use_level2_map: false,
		sound_enabled: false,

        hiddenMonsterSpeed: 200,
        hiddenMonsterPathSpeed: 140,

		key: {
			LEFT: 37,
			UP: 38,
			RIGHT: 39,
			DOWN: 40,
			ENTER: 13,
			SPACE: 32,
			W: 87,
			A: 65,
			S: 83,
			D: 68,
			M: 77,
			P: 80,

			pressed: {},

			reset: function(){
				this.pressed = {};
			},

			isPressed: function(key){
				return this.pressed[key] > 0;
			}
		},

		keysToDir: function(){
			var key = cm.key;
			var p = /*new*/ cm.Point(0, 0);
			if(key.isPressed(key.UP) || key.isPressed(key.W)){
				p.y = p.y - 1;
			}
			if(key.isPressed(key.DOWN) || key.isPressed(key.S)){
				p.y = p.y + 1;
			}
			if(key.isPressed(key.LEFT) || key.isPressed(key.A)){
				p.x = p.x - 1;
			}
			if(key.isPressed(key.RIGHT) || key.isPressed(key.D)){
				p.x = p.x + 1;
			}
			return p.normalize();
		},

		DIR_STAY: -1,
		DIR_UP: 0,
		DIR_RIGHT_UP: 1,
		DIR_RIGHT: 2,
		DIR_RIGHT_DOWN: 3,
		DIR_DOWN: 4,
		DIR_LEFT_DOWN: 5,
		DIR_LEFT: 6,
		DIR_LEFT_UP: 7,

		dirToIndex: function(p){
			var edge = 0.5;
			var flag = ((p.x < -edge ? (1<<0) : p.x > edge ? (1<<1) : 0)
					| (p.y < -edge ? (1<<2) : p.y > edge ? (1<<3) : 0));
			// case 0: return DIR_DOWN;
			flag == (1<<0) && return cm.DIR_LEFT;
			flag == (1<<1) && return cm.DIR_RIGHT;
			flag == (1<<2) && return cm.DIR_UP;
			flag == (1<<3) && return cm.DIR_DOWN;
			flag == (1<<0)|(1<<2) && return cm.DIR_LEFT_UP;
			flag == (1<<1)|(1<<2) && return cm.DIR_RIGHT_UP;
			flag == (1<<0)|(1<<3) && return cm.DIR_LEFT_DOWN;
			flag == (1<<1)|(1<<3) && return cm.DIR_RIGHT_DOWN;
			return cm.DIR_STAY;
		},

		sound: {
			formats: {},
			sounds: {},

			create: function(id, params){
				if(!id){
					return;
				}
				if(!params) params = {};
				/* if(!cm.sound_enabled){
					return;
				} */
				if(this.sounds[id] === undefined){
					var sounds = this.sounds
					var name = id
					var ext = ".wav"
					var url = game.config.url.base_url+'/sounds/';
					if(id.substring(0, 5) == 'temp/'){
						name = id.substring(5, 1000);
					}
					if(this.formats.mp3){
						ext = ".mp3";
						if(id != name) url = game.config.url.base_url+'/sounds/temp/';
					}else if(this.formats.ogg){
						ext = ".ogg";
						if(id != name) url = game.config.url.base_url+'/temp/sounds.src/';
					}else{
						if(id != name) url = game.config.url.base_url+'/temp/sounds.src/';
					}
					var sound_url = url + name + ext;
					if(cm.soundMap[id] !== undefined){
						sound_url = cm.soundMap[id];
					}
                    // [begin debug]
					// cm.log("[create sound] "+sound_url);
                    // [end debug]
					sounds[id] = {id: id, sound: null, loaded: false, start_time: 0, finish_time: 0};
					return sounds[id].sound = soundManager.createSound({
						id: id,
						url: sound_url+"?"+cm.consts.SOUNDS_VERSION,
						autoLoad: true,
						autoPlay: params.autoPlay !== undefined ? params.autoPlay : false,
						volume: params.volume !== undefined ? params.volume : 100,
						loops: params.loop ? 99999999 : 1,
						multiShot: true,
						onfinish: function(){
							sounds[id].finish_time = cm.getTimeMS();
							// cm.log("[sound] finished "+id);
							if(sounds[id].loop){
								sounds[id].sound.play();
							}
							/* if(sounds[id].channel == "fire"){
								alert('fire is finished');
							} */
							if(params.onfinish) params.onfinish();
						},
						onstop: function(){
							sounds[id].finish_time = cm.getTimeMS();
							// cm.log("[sound] stop "+id);
							/* if(sounds[id].channel == "fire"){
								alert('fire is stopped');
							} */
						},
						onload: function() {
							// cm.log('[sound] '+this.sID+' loaded');
							sounds[id].loaded = true;
							// cm.log("[sound] loaded", id, sound_url);
						},
						ondataerror: function(){
                            // [begin debug]
							if(cm.logEnabled) cm.log("[sound] data error", id, sound_url);
                            // [end debug]
							// alert("[sound] data error "+id);
						}
					});
				}
				return this.sounds[id].sound;
			},

			register: function(id){
				if(!cm.sound_enabled || !id){
					return;
				}
				if(this.sounds[id] === undefined){
					this.create(id);
					return true;
				}
				return false;
			},

			channels: {},
			actorChannels: {},
			max_channels: 2,

			isPlaying: function(id){
				/* if(!cm.sound_enabled){
					return false;
				} */
				var sound = this.sounds[id];
				return sound !== undefined && sound.start_time > sound.finish_time;
			},

			setVolume: function(params){ // actor, channel, id, lock_ms, priority){
				if(!cm.sound_enabled){
					return;
				}
				var actor = params.actor ? params.actor : "actor-unknown"
				var channel_name = params.channel ? params.channel : "channel-unknown";

				var channel = this.actorChannels[actor+'#'+channel_name];
				if(channel){
					channel.sound.setVolume(params.volume);
				}
			},

			getVolume: function(params){ // actor, channel, id, lock_ms, priority){
				if(!cm.sound_enabled){
					return;
				}
				var actor = params.actor ? params.actor : "actor-unknown"
				var channel_name = params.channel ? params.channel : "channel-unknown";

				var channel = this.actorChannels[actor+'#'+channel_name];
				if(channel){
                    // [begin debug]
                    if(cm.logEnabled) cm.log('getVolume', channel.sound);
                    // [end debug]
					return channel.sound.options.volume;
				}
			},

            fadeMusicOut: function(dt, callback){
				if(!cm.sound_enabled){
					return;
				}
				var actor = 'level'
				var channel_name = 'music';
				var channel = this.actorChannels[actor+'#'+channel_name];
				if(channel){
                    var self = this;
                    if(dt === undefined || dt < 1){
                        dt = 1;
                    }
                    var start_time = cm.getTimeMS()
					var end_time = start_time + dt;
                    var start_volume = channel.sound.options.volume;
                    var steps = cm.max(1, start_volume * 15 / 100);
                    var interval_dt = dt / steps;
                    if(interval_dt < 10) interval_dt = 10;
                    if(interval_dt > dt) interval_dt = dt;
                    var timer = setInterval(function(){
                        var cur_time = cm.getTimeMS();
                        if(cur_time >= end_time){
                            clearInterval(timer);
                            self.stop({actor:'level', channel:'music'});
                            if($.isFunction(callback)){
                                callback();
                            }
                        }else{
                            var t = (cur_time - start_time) / (end_time - start_time);
                            channel.sound.setVolume(start_volume * (1.0 - t));
                        }
                    }, interval_dt);
                }
            },

			stop: function(params){ // actor, channel, id, lock_ms, priority){
				if(!cm.sound_enabled){
					return;
				}
				var actor = params.actor ? params.actor : "actor-unknown"
				var channel_name = params.channel ? params.channel : "channel-unknown";

				var channel = this.actorChannels[actor+'#'+channel_name];
				if(channel){
					channel.loop = false;
					channel.sound.stop();
				}
			},

            stopMusic: function(){
                this.stop({actor:"level", channel:"music"});
            },

            stopAll: function(){
                for(var i in this.actorChannels){
                    var channel = this.actorChannels[i];
                    if(channel){
                        channel.loop = false;
                        channel.sound.stop();
                    }
                }
            },

			play: function(params){ // actor, channel, id, lock_ms, priority){
				if(!cm.sound_enabled || !cm.soundMode || !params.sound){
					return;
				}
				var actor = params.actor ? params.actor : "actor-unknown"
				var channel_name = params.channel ? params.channel : "channel-unknown"
				var id = params.sound ? params.sound : "sound-unknown"
				var lock_ms = params.lock_ms ? params.lock_ms : 700
				var loop = params.loop ? params.loop : false
				var priority = params.priority ? params.priority : 1
				var volume = params.volume ? params.volume : 90
				var each = params.each ? params.each : 1;

                if(channel_name == 'music' && actor == 'level' && cm.soundMode < 2){
                    return;
                }

                id = cm.randItem(id);
				if(!id){
					return;
				}

				var sound = this.sounds[id];
				if(!sound){
					var soundParams = {volume: volume};
					if(params.autoPlay !== undefined) soundParams.autoPlay = params.autoPlay;
					// if(params.volume !== undefined) soundParams.volume = params.volume;
					if(params.loop !== undefined) soundParams.loop = params.loop;
					if(params.onfinish !== undefined) soundParams.onfinish = params.onfinish;
					this.create(id, soundParams);
					if(!(sound = this.sounds[id])){
						// [begin debug]
                        if(cm.logEnabled) cm.log("[play sound] "+id+" is unknown");
                        // [end debug]
						return;
					}
				}
				if(!sound.loaded && !params.autoPlay){
					// cm.log("[play sound] "+id+" is not loaded");
					return;
				}
				var cur_time = cm.getTimeMS();
				if(loop){
					if(sound.loop && sound.start_time > sound.finish_time){
						// cm.log("[play sound] "+id+" skip for LOOP");
						return;
					}
				}else if(/*sound.start_time > sound.finish_time &&*/ cur_time - sound.start_time < lock_ms){
					// cm.log("[play sound] "+id+" skip, dt "+(cur_time - sound.start_time));
					return;
				}
				if(each > 1){
					var run_count;
					if( (run_count = (sound.run_count = (run_count = sound.run_count) ? run_count+1 : 1) % each) != 0){
						// cm.log("[play sound] "+id+" skip, each "+each+", cur "+run_count);
						return;
					}
				}

				var count = 0;
				var channel = this.actorChannels[actor+'#'+channel_name];
				if(channel){
					if(loop){
						/* if(channel.loop && channel.start_time > channel.finish_time){
							cm.log("[play sound] "+id+" FAST skip for LOOP");
							return;
						} */
					}else if(cur_time - channel.start_time < lock_ms){
						// cm.log("[play sound] "+actor+" "+channel_name+" "+id+" FAST skip, dt "+(cur_time - channel.start_time));
						return;
					}
					channel.sound.stop();
					// cm.log("[channels] stop & delete FAST CUR channel "+channel.id+", dt "+(cur_time - channel.start_time));
					delete this.channels[channel.id];
				}
				for(var i in this.channels){
					channel = this.channels[i];
					if(channel.start_time <= channel.finish_time){
						// cm.log("[channels] delete finished channel "+i);
						delete this.channels[i];
						continue;
					}
					if(channel.id == id || (channel.actor == actor && channel.channel == channel_name)){
						alert("stop & delete CUR channel "+actor+" "+channel_name+" "+id+" skip, dt "+(cur_time - channel.start_time));
						if(loop){
							/* if(channel.loop && channel.start_time > channel.finish_time){
								cm.log("[play sound] "+id+" skip for LOOP");
								return;
							} */
						}else if(cur_time - channel.start_time < lock_ms){
							// [begin debug]
                            if(cm.logEnabled) cm.log("[play sound] "+actor+" "+channel_name+" "+id+" skip, dt "+(cur_time - channel.start_time));
                            // [end debug]
							return;
						}
						channel.sound.stop();
						// cm.log("[channels] stop & delete CUR channel "+i+", dt "+(cur_time - channel.start_time));
						delete this.channels[i];
						continue;
					}
					count++;
				}
				if(count >= this.max_channels){
					if(count == this.max_channels){ // have to delete only one channel, fast method
						var best_channel, best_start_time = cur_time;
						for(i in this.channels){
							if((channel = this.channels[i]).priority < priority){
								best_channel = channel; // found low priority channel, delete it
								break;
							}
							if(channel.priority == priority && best_start_time > channel.start_time){
								best_start_time = channel.start_time;
								best_channel = channel;
							}
						}
						if(best_channel === undefined){
							// cm.log("[play sound] "+id+" FAST skip due to max channels number reached "+count);
							return;
						}
						channel = best_channel;
						// cm.log("[channels] FAST check channels number, cur "+count+", stop & delete "+(channel.priority < priority ? "LOW PRIORITY " : "")+"channel "+channel.id+", dt "+(cur_time - channel.start_time));
						delete this.channels[channel.id];
					}else{
						var delete_channels_list = [];
						for(i in this.channels){
							if((channel = this.channels[i]).priority <= priority){
								delete_channels_list.push(channel);
							}
						}
						delete_channels_list.sort(function(a, b){
							return b.priority - a.priority || b.start_time - a.start_time;
						});
						// cm.log('delete_channels_list ', delete_channels_list.length);
						for(; count >= this.max_channels; count--){
							if(!delete_channels_list.length){
								// cm.log("[play sound] "+id+" skip due to max channels number reached "+count);
								return;
							}
							channel = delete_channels_list.pop();
							channel.sound.stop();
							// cm.log("[channels] check channels number, cur "+count+", stop & delete "+(channel.priority < priority ? "LOW PRIORITY " : "")+"channel "+channel.id+", dt "+(cur_time - channel.start_time));
							delete this.channels[channel.id];
						}
					}
				}
				this.channels[id] = sound;
				this.actorChannels[actor+'#'+channel_name] = sound;
				sound.actor = actor;
				sound.channel = channel;
				sound.start_time = cur_time;
				sound.priority = priority;
				sound.loop = loop;
				// sound.run_count = cm.param(sound.run_count, 0) + 1;
				sound.sound.stop();
				/* if(1 || loop){
					cm.log("[play sound] loop ",id);
					sound.sound.play({loops:5});
				}else{
					sound.sound.play({loops:1});
				} */
				sound.sound.play({volume: volume});
				// soundManager.play(id);
				// cm.log("[play sound] ",actor, channel, id, lock_ms);
			}
		},

		getMonsterByName: function(nameId){
			nameId = 'ITEM_MONSTER_'+nameId.toUpperCase().replace("-", '_');
			var item = cm.playerData.itemsByNameId[nameId];
			if(item && item.actorParams){
				// [begin debug]
                if(cm.logEnabled) cm.log('getMonsterByName '+nameId+' - found');
                // [end debug]
				return item.actorParams;
			}
            // [begin debug]
			if(cm.logEnabled) cm.log('getMonsterByName '+nameId+' - NOT FOUND');
            // [end debug]
			return undefined;
		},

		/*
		getWeaponByName: function(nameId){
			nameId = 'ITEM_WEAPON_'+nameId.toUpperCase();
			var item = cm.playerData.itemsByNameId[nameId];
			if(item && item.actorParams){
				cm.log('getWeaponByName '+nameId+' - found');
				return item.actorParams;
			}
			cm.log('getWeaponByName '+nameId+' - NOT FOUND');
			return undefined;
		},
		*/

		getItemByName: function(nameId){
			nameId = 'ITEM_'+nameId.toUpperCase();
			var item = cm.playerData.itemsByNameId[nameId];
			if(item && item.actorParams){
				// [begin debug]
                if(cm.logEnabled) cm.log('getItemByName '+nameId+' - found');
                // [end debug]
				return item.actorParams;
			}
            // [begin debug]
			if(cm.logEnabled) cm.log('getItemByName '+nameId+' - NOT FOUND', cm.playerData.itemsByNameId);
            // [end debug]
            return undefined;
		},

        getMedalByNum: function(num){
            var item = cm.playerData.medalsByOrder[num-1];
            if(item && item.actorParams){
                // [begin debug]
                if(cm.logEnabled) cm.log('getMedalByNum '+num+' - found', item.actorParams);
                // [end debug]
                return item.actorParams;
            }
            // [begin debug]
			if(cm.logEnabled) cm.log('getMedalByNum '+num+' - NOT FOUND');
            // [end debug]
            return undefined;
        },

		director: null,

		// logStrings: [],
        logEnabled: true,
		log: function(){
			// [begin debug]
            console.log.apply(console, arguments);
            // [end debug]
		},

		stopEvent: function (e)
		{
			e.cancelBubble = true;
			e.stopPropagation();
			e.preventDefault();
		},

		onKeyDown: function(e){
			key = e.which || e.keyCode;
			cm.key.pressed[key] = 1;
			// cm.log("[key-down] "+key);
            this.stopEvent(e);
		},

		onKeyUp: function(e){
			key = e.which || e.keyCode;
			cm.key.pressed[key] = 0;
			// cm.log("[key-up] "+key);
            this.stopEvent(e);
		},

		onResize: function(){
            // [begin debug]
			if(cm.logEnabled) cm.log("[resize] "+$(window).width()+" "+$(window).height());
            // [end debug]
		},

		onBlur: function(){
			// [begin debug]
            if(cm.logEnabled) cm.log("[blur]");
            // [end debug]
			cm.key.reset();
		},

		onFocus: function(){
            // [begin debug]
			if(cm.logEnabled) cm.log("[focus]");
            // [end debug]
		},

		onContextMenu: function(e){
            // [begin debug]
			if(cm.logEnabled) cm.log("[contextmenu]");
            // [end debug]
			// this.stopEvent(e);
		},

		level: null,
		playerData: {
            levels: 1,
            maxMedalNum: 0,

			money: 0,
			meat: 0,

			moneySumCollected: 0,
			meatSumCollected: 0,

			enemyKilled: 0,

			health: 100,
			armor: 100,

			healthDamaged: 0,
			armorDamaged: 0,
			// damaged: 0,
			damagedTime: 0,

			moneySent: 0,
			meatSent: 0,

			healthRecovered: 0,
			armorRecovered: 0,

			healthRecoverMeatUsed: 0,
			armorRecoverMoneyUsed: 0,

			armorItem: null,
			defaultWeaponItem: null,

			// items: {},
			originItems: {},
			itemsById: {},
			itemsByNameId: {},
			itemsByTypeId: {},
            medalsByOrder: [],

			killedCountById: {},
            medalsCollectedCountById: {},
			itemsCollectedCountById: {},
			usedCountById: {},

			startTimeSec: 0,
			playTimeSec: 0,
			daysCompleted: 0,

			activeItems: {},
			activeArtefacts: {},
			activeArmors: {},
			activeWeapons: {},

			effects: {
				scale: {
					weaponDamage: 1.0,
					weaponFrequency: 1.0,
					weaponSpeed: 1.0,
					weaponDensity: 1.0,
					playerArmor: 1.0,
					playerHealth: 1.0,
					playerSpeed: 1.0,
					monsterHealth: 1.0,
					monsterSpeed: 1.0
				},
				weaponFireType: 0
			}
		},

		paused: false,

		pause: function(){
			if(!this.paused){
                this.paused = true;
				if(this.level.player && this.level.player.isPlayer){
					this.level.player.endFire();
				}
            }
		},
		unpause: function(){
			this.paused = false;
		},
		togglePause: function(){
			this.paused = !this.paused;
            if(this.paused){
				if(this.level.player && this.level.player.isPlayer){
					this.level.player.endFire();
				}
            }
            return this.paused;
		},

		objToText: function(data){
			var str = typeof data !== "string" ? $.JSON.encode(data) : data
			var partLen = 100;
			if(str){
				for(var len = str.length-partLen; len > partLen; len = len - partLen){
					str = str.substring(0, len) .. " " .. str.substring(len, 100000);
				}
			}
			return str;
		},

		showDebugAlert: function(){
			var s = "";
			for(var i = 0; i < arguments.length; i++){
				s = s .. this.objToText(arguments[i]);
			}
			alert(s);
		},

		cryptionKeys: null,
		cryptionKeysTime: null,
		callbacks: null,
		consts: null,
		urls: null,
		soundMap: {},

        musicList: [],
        curMusicIndex: 0,
        musicTimeMS: 0,
        musicStartTimer: null,
        playMusic: function(i){
            this.sound.stopMusic();

            if(this.soundMode < 2){
                return;
            }
            if(i !== undefined){
                this.curMusicIndex = i;
            }
            if(this.musicList.length < 1){
                return;
            }
            this.curMusicIndex = this.curMusicIndex % this.musicList.length;

            clearTimeout(this.musicStartTimer);
            var curTimeMS = this.getTimeMS()
			var minTimeMS = 1000*2;
            if(curTimeMS - this.soundModeTimeMS < minTimeMS){
                this.musicStartTimer = setTimeout(function(){
                    cm.playMusic();
                }, minTimeMS - (curTimeMS - this.soundModeTimeMS));
                return;
            }

			i = this.curMusicIndex
			this.curMusicIndex = this.curMusicIndex + 1
            cm.sound.play({
                actor: "level",
                channel: "music",
                priority: 100,
                sound: [ this.musicList[i] ],
                volume: 65,
                loop: false,
                autoPlay: true,
                onfinish: function(){
                    cm.playMusic();
                }
            });
        },

        soundMode: 2, // 0 - off, 1 - sound only, 2 - sound and music
        soundModeTimeMS: 0,
        toggleSoundMode: function(i){
            var curTimeMS = this.getTimeMS();
            // console.log('sound time', this.soundModeTimeMS, curTimeMS, curTimeMS - this.soundModeTimeMS);
            if(curTimeMS - this.soundModeTimeMS < 50){
                return this.soundMode;
            }
            this.soundModeTimeMS = curTimeMS;
            if(i !== undefined){
                this.soundMode = cm.clamp(i|0, 0, 2);
            }else if(--this.soundMode < 0){
                this.soundMode = 2;
            }
			var soundMode = this.soundMode
            if(soundMode == 0) this.sound.stopAll();
            elseif(soundMode == 1) this.sound.stopMusic();
            elseif(soundMode == 2) this.playMusic();
            return soundMode;
        },
        getSoundMode: function(){
            return this.soundMode;
        },

		getTimeMS: function(d){
			if(!d){
				d = /*new*/ Date();
			}
			return d.getTime() + d.getMilliseconds() / 1000.0;
		},

		pingTimer: null,
		pingTick: 0,
		startPingProcess: function(){
			var blocked = false;
			function ping(force_ping){
                // [begin debug]
				if(cm.logEnabled) cm.log('ping');
                // [end debug]
				if(force_ping || (!blocked && cm.getTimeMS() - cm.ajaxTime > 30*1000)){
					blocked = true;
					cm.pingTick = cm.pingTick + 1
					cm.ajaxCrypt(cm.urls['ping'], {'tick': cm.pingTick - 1},
						function(){
							blocked = false;
						},
						function(){
							blocked = false;
						});
				}
			};
			ping(true);
			clearInterval(this.pingTimer);
			this.pingTimer = setInterval(ping, 60*1000);
		},

		ajaxTime: 0,
		ajax: function(url, data, callback, error_callback){
			this.ajaxTime = this.getTimeMS();
			function callCallback(callback, params){
				if(callback !== undefined){
					if($.isArray(callback)){
						cm.each(callback, function(i, callback){
							callCallback(callback, params);
						});
					}else{
						callback.apply(undefined, params);
					}
				}
			};
			$.ajax({
				'type': 'POST',
				'cache': false,
				'dataType':'json',
				'data': data,
				'url': url,
				'success': function(result){
					callCallback(callback, [result]);
				},
				'error': function(xhr, textStatus, errorThrown){
					// [begin debug]
                    if(cm.logEnabled) cm.log('AJAX ERROR', textStatus, xhr, errorThrown);
					// cm.showDebugAlert('AJAX error ', textStatus, xhr, errorThrown);
                    // [end debug]
					callCallback(error_callback, [xhr, textStatus, errorThrown]);
					cm.callbacks['ajaxError'](xhr, textStatus, errorThrown);
				}
			});
		},

		ajaxCrypt: function(url, data, callback, error_callback){
			var org_data = data;
			function ajax(data){
				var ajax_data = data;
				var startMS = cm.getTimeMS();
				cm.ajax(url, data,
					[ function(data){
						if(1){ // debug
							var text = cm.objToText(data);
							if(text.indexOf("error encode") >= 0){
								cm.showDebugAlert("PHP ERROR ", url, text);
								// [begin debug]
                                if(cm.logEnabled) cm.log('PHP DECRYPT - ERROR', data, 'response ms '+cm.round(cm.getTimeMS() - startMS, 2), 'keys time '+cm.cryptionKeysTime.getTime(), url);
                                // [end debug]
								if(error_callback) error_callback(undefined, undefined, undefined);
								return;
							}else{
                                // [begin debug]
								if(cm.logEnabled) cm.log('php decrypt - ok', data, 'response ms '+cm.round(cm.getTimeMS() - startMS, 2), 'keys time '+cm.cryptionKeysTime.getTime(), url);
                                // [end debug]
							}
						}
						/*
						if(callback) callback(data, result);
						*/
					}, callback ],
					[ function(xhr, textStatus, errorThrown){
					}, error_callback ]
				);
			};

			if(this.cryptionKeys !== null && game.config.cryption_enabled){
				var json = $.JSON.encode(data);
				var startMS = cm.getTimeMS();
				$.jCryption.encrypt(json, this.cryptionKeys, function(crypted){
					// [begin debug]
                    if(cm.logEnabled) cm.log('crypted data len '+crypted.length+', ms '+cm.round(cm.getTimeMS() - startMS, 2), crypted);
                    // [end debug]
					ajax({'crypted_data': crypted});
				});
			}else{
				ajax(data);
			}
		},

		getItemRemainPercentage: function(id){
			return cm.level.getItemRemainPercentage(id);
		},

        getItemCountData: function(id){
            var item = cm.playerData.itemsById[id];
            // console.log('engine getItemCountData', id, item, cm.playerData.itemsById[parseInt(id)]);
            if(item === undefined){
                return {
                    'count': 0,
                    'remain_ms': 0
                    // 'remain_percentage': 0,
                }
            }
            return {
                'count': item.count,
                'remain_ms': Math.ceil(item.remainMS)
            }
        },

        initItemsActivated: function(){
            return cm.level.initItemsActivated();
        },

		ajaxUseItem: function(id, callback, error_callback){
			var item = cm.playerData.itemsById[id];
			if(item === undefined)
                /* || (item.count < 1
                && item != cm.playerData.defaultWeaponItem
                && item != cm.playerData.armorItem
                )) */
            {
				return false;
			}
			// cm.playerData.usedItemsById[id] = item;

            if(item.count > 0){
                item.count = item.count-1;
            }
            cm.level.activateItem(item, true);

            if(cm.level.params.level >= 1){
                cm.ajaxCrypt(cm.urls['useItem'], {'id': id},
                    [ function(data){
                        item.count = cm.toFloat(data['count']);
                        item.remainMS = cm.toFloat(data['remain_time']) * 1000;
                        /* if(delayedActivate && item.remainMS > 0){
                            cm.level.activateItem(item, true);
                        } */
                        // [begin debug]
                        if(cm.logEnabled) cm.log('ajaxUseItem '+id+' activated', data);
                        // [end debug]
                    }, callback ],
                    [ function(xhr, textStatus, errorThrown){
                        // TODO: handle error
                    }, error_callback ]
                );
            }
			return {
				'action_time': item.durationMS,
				'count': item.count
			};
		},

		ajaxTouchItem: function(id, callback, error_callback){
			var item = cm.playerData.itemsById[id];
			if(item === undefined || item.count < 1){
				return false;
			}
            if(cm.level.params.level >= 1){
                cm.ajaxCrypt(cm.urls['touchItem'], {'id': id},
                    [ function(data){
                        item.count = cm.toFloat(data['count']);
                        item.ingame = cm.toFloat(data['ingame']) * 1000;
                        // [begin debug]
                        if(cm.logEnabled) cm.log('ajaxTouchItem '+id+' finished');
                        // [end debug]
                    }, callback ],
                    [ function(xhr, textStatus, errorThrown){
                        // TODO: handle error
                    }, error_callback ]
                );
            }
			return true;
		},

        ajaxPlayerDead: function(try_renew_player){
            if(cm.level.params.level >= 1){
                cm.ajaxCrypt(cm.urls[try_renew_player ? 'renewPlayer' : 'playerDead'], {
                        'level': cm.level.params.level,
                        'invasion': cm.level.params.invasion,
                        'day': cm.level.params.day
                    },
                    function(data){
                        if(data['renew_player']){
                            cm.level.renewPlayer();
                        }else{
                            cm.callbacks['playerDead'](data, function(){
                                cm.ajaxPlayerDead(true);
                            });
                        }
                    },
                    function(xhr, textStatus, errorThrown){
                        // TODO: handle error
                    }
                );
            }
			return true;
        },

		create: function( params ){
			var canvas = params['canvas']
			var level = parseInt(params['level'])
			var invasion = parseInt(params['invasion'])
			var day = parseInt(params['day'])
			var urls = cm.clone(params['urls'] || {})
			var callbacks = cm.clone(params['callbacks'] || {})
			var consts = cm.clone(params['consts'] || {})
			var soundMap = cm.clone(params['soundMap'] || {})

			if(!$.isFunction(callbacks['countDown'])){
				callbacks['countDown'] = function(count, stepCallback, continueCallback){
					continueCallback();
				};
			}

			if(!$.isFunction(callbacks['dayFinished'])){
				callbacks['dayFinished'] = function(level, invasion, day, data, continueCallback){
					continueCallback();
				};
			}

			cm.each(['startLoading', 'progressLoading', 'endLoading',
				'gameStarted', 'dayStarted', 'dayFinished',
				'showLoader', 'hideLoader', 'playerDead',
                'itemActivated', 'itemDeactivated', 'defaultWeaponActivated',
                'playerDamagedWithNoControl'], function(i, name){
				if(!$.isFunction(callbacks[name])){
					callbacks[name] = function(){};
				}
			});

			cm.callbacks = callbacks;
			cm.consts = consts;
			cm.urls = urls;
			cm.soundMap = soundMap;

			consts.ITEM_TYPE_WEAPON = consts['ITEM_TYPE_WEAPON'];
			consts.ITEM_TYPE_ARTEFACT = consts['ITEM_TYPE_ARTEFACT'];
			consts.ITEM_TYPE_RESOURCE = consts['ITEM_TYPE_RESOURCE'];
			consts.ITEM_TYPE_OBJECT = consts['ITEM_TYPE_OBJECT'];
			consts.ITEM_TYPE_MONSTER = consts['ITEM_TYPE_MONSTER'];
			consts.ITEM_TYPE_ACHIEVEMENT = consts['ITEM_TYPE_ACHIEVEMENT'];
			consts.ITEM_TYPE_ARMOR = consts['ITEM_TYPE_ARMOR'];
			consts.ITEM_TYPE_MEDAL = consts['ITEM_TYPE_MEDAL'];
			consts.SOUNDS_VERSION = consts['SOUNDS_VERSION'];
			consts.IMAGES_VERSION = consts['IMAGES_VERSION'];

			var canvasElement = canvas[0]
			var width = canvas.width()
			var height = canvas.height();

			this.director = /*new*/ CAAT.Director().initialize( width, height, canvasElement );
			// this.director.debug = true;

			CAAT.DRAG_THRESHOLD_X = 1;
			CAAT.DRAG_THRESHOLD_Y = 1;

			if(0){
                var listener = $(window);
                // var listener = canvas;
				listener.bind('keydown', function(e){
					cm.onKeyDown(e);
				});

				listener.bind('keyup', function(e){
					cm.onKeyUp(e);
				});

				$(window).resize(function(){
					cm.onResize();
				});

				$(window).blur(function(){
					cm.onBlur();
				});

				$(window).focus(function(){
					cm.onFocus();
				});

				$(window).bind("contextmenu", function(e){
					cm.onContextMenu(e);
				});
			}else{
				window.addEventListener("keydown", function(e){
					cm.onKeyDown(e);
                    return false;
				}, true);

				window.addEventListener("keyup", function(e){
					cm.onKeyUp(e);
                    return false;
				}, true);

				window.addEventListener("resize", function(){
					cm.onResize();
                    // return false;
				}, true);

				window.addEventListener("blur", function(){
					cm.onBlur();
                    // return false;
				}, true);

				window.addEventListener("focus", function(){
					cm.onFocus();
                    // return false;
				}, true);

				document.body.addEventListener("contextmenu", function(e){
					cm.onContextMenu(e);
                    // return false;
				}, true);
			}

			var loadImages =
				[
					// {id: 'player', url: '???'},
					{id: 'player-face', url: 'images/player-face.png'},
					{id: 'player-armor', url: 'images/player-armor.png'},

					{id: 'meat', url: 'images/meat.png'},
					{id: 'money', url: 'images/money.png'},
					{id: 'blood-monster', url: 'images/blood-monster.png'},
					{id: 'blood-player', url: 'images/blood-player.png'},

					{id: 'red_0', url: 'images/red_0.png'},
					{id: 'red_45', url: 'images/red_45.png'},
					{id: 'red_90', url: 'images/red_90.png'},
					{id: 'red_135', url: 'images/red_135.png'},
					{id: 'red_180', url: 'images/red_180.png'},
					{id: 'red_225', url: 'images/red_225.png'},
					{id: 'red_270', url: 'images/red_270.png'},
					{id: 'red_315', url: 'images/red_315.png'},

					{id: 'green_0', url: 'images/green_0.png'},
					{id: 'green_45', url: 'images/green_45.png'},
					{id: 'green_90', url: 'images/green_90.png'},
					{id: 'green_135', url: 'images/green_135.png'},
					{id: 'green_180', url: 'images/green_180.png'},
					{id: 'green_225', url: 'images/green_225.png'},
					{id: 'green_270', url: 'images/green_270.png'},
					{id: 'green_315', url: 'images/green_315.png'},

					{id: 'medal_shine', url: 'images/medal_shine.png'},
					{id: 'aim', url: 'images/aim.png'}
				];

			var loadSounds = [];

			function loadSteps(params){
				var loader = {
					failed: false,
					steps: params.steps,
					progressCount: undefined, // params.steps.length,
					curStep: 0,
					timeoutTimer: null,
					timeoutSecs: 60,
					timeoutCallback: params.timeoutCallback,

					progress: function(params){
						var count = params.count;
						if(count === undefined){
							count = loader.progressCount;
						}else{
							loader.progressCount = count;
						}
						params.name = params.name.toLowerCase().replace('_', '-');
						callbacks['progressLoading']({'i':params.i, 'count':count, 'name':params.name});
					},

					startTimeout: function(){
						clearTimeout(loader.timeoutTimer);
						if(!loader.failed){
							loader.timeoutTimer = setTimeout(function(){
								loader.failed = true;
								// TODO: notify client
								if(loader.timeoutCallback){
									loader.timeoutCallback();
								}
							}, loader.timeoutSecs * 1000);
						}
					},

					nextStep: function(){

						setTimeout(function(){
							if(!loader.failed && loader.curStep < loader.steps.length){
								loader.startTimeout();
								loader.steps[loader.curStep].call(loader, loader.curStep);
								loader.curStep = loader.curStep + 1;
							}
						}, 0);
					}
				};
				loader.nextStep();
			};

			function loadGame()
			{
				var tiledMap, maxMedalNum, dayParams, curItem = 0, musics;

				callbacks['startLoading'](function(){
                    loadSteps({steps: [
                        function openLoadingPanel(){
                            this.progress({i:curItem++, name:'init'});
                            this.nextStep();
                        },

                        function loadKeys(){
                            var self = this;
                            this.progress({i:curItem++, name:'init cryption'});

                            function storeKeys(keys){
                                cm.cryptionKeys = keys;
                                cm.cryptionKeysTime = /*new*/ Date();
                                // cm.showDebugAlert('KEYS ', keys);
                                // [begin debug]
                                if(cm.logEnabled) cm.log('loaded keys', keys, 'time '+cm.cryptionKeysTime.getTime());
                                // [end debug]
                                self.nextStep();
                            };

                            if(game.config.cryption_enabled){
                                $.jCryption.getKeys(urls['generateCryptKeys'], storeKeys);
                            }else{
                                $.ajax({
                                    // type: "POST",
                                    'cache': false,
                                    'dataType':'json',
                                    // data: {},
                                    'url': urls['generateCryptKeys'],
                                    'success': storeKeys,
                                    'error': function(xhr, textStatus, errorThrown){
                                        // alert(textStatus);
                                        // [begin debug]
                                        if(cm.logEnabled) cm.log(xhr, textStatus, errorThrown);
                                        // [end debug]
                                        // error handler
                                        self.failed = true;
                                    }
                                });
                            }
                        },

                        function testCryption(){
                            var self = this;
                            this.progress({i:curItem++, name:'check cryption'});
                            cm.ajaxCrypt(urls['testCryption'], {'key': 'value', 'key2': 'value2'},
                                function(){
                                    // alert('testCryption - ok');
                                    self.nextStep();
                                },
                                function(xhr, textStatus, errorThrown){
                                    // alert('testCryption - ERROR');
                                    self.failed = true;
                                });
                        },

                        function loadItemsData(){
                            var self = this;
                            this.progress({i:curItem++, name:'items data'});

                            cm.ajaxCrypt(urls['loadItemsData'], {'type': 'all', 'level': level}, function(data){
                                cm.playerData.originItems = data;
                                cm.startPingProcess();
                                self.nextStep();
                            }, function(){
                                // error handler
                                self.failed = true;
                            });
                        },

                        function initItems(){
                            this.progress({i:curItem++, name:'init items'});
                            // loadImages = [];

                            var playerData = cm.playerData
							var f = cm.toFloat;

                            playerData.itemsById = {};
                            playerData.itemsByNameId = {};
                            playerData.itemsByTypeId = {};
                            playerData.medalsByOrder = [];
                            // playerData.usedItemsById = {};

                            playerData.killedCountById = {};
                            playerData.medalsCollectedCountById = {};
                            playerData.itemsCollectedCountById = {};
                            playerData.usedCountById = {};

                            // playerData.activeArmorItem = null;
                            // playerData.activeWeaponItem = null;

                            cm.each(playerData.originItems, function(type_id, originItems){
                                cm.each(originItems, function(id, originItem){
                                    var item = {
                                        originItem: originItem,
                                        id: f( originItem['id'] ),
                                        typeId: f( originItem['type_id'] ),
                                        durationMS: f( originItem['action_time'] ) * 1000,
                                        nameId: originItem['name_id'],
                                        name: originItem['name'],
                                        desc: originItem['desc'],
                                        imageUrl: originItem['image_url'],
                                        data: originItem['data'] || {'sounds':{}},
                                        count: f( originItem['count'] ),
                                        ingame: f( originItem['ingame'] ) * 1000,
                                        remainMS: f( originItem['remain_time'] ) * 1000,
                                        order: f( originItem['sort_order'] )
                                    };
                                    playerData.itemsById[id] = item;
                                    playerData.itemsByNameId[item.nameId] = item;

                                    if(playerData.itemsByTypeId[item.typeId] === undefined){
                                        playerData.itemsByTypeId[item.typeId] = {};
                                    }
                                    playerData.itemsByTypeId[item.typeId][id] = item;

                                    loadImages.push({id:item.nameId, url:item.imageUrl});
                                    // cm.log('item', type_id, item['type_id'], cm.consts['ITEM_TYPE_MONSTER'], item['image_url']);

                                    var data = item.data;
                                    cm.each(data['sounds'], function(i, sounds){
                                        cm.each(sounds, function(i, sound){
                                            loadSounds.push(sound);
                                        });
                                    });

                                    if(type_id == cm.consts.ITEM_TYPE_MONSTER){
                                        item.actorParams = {
                                            itemId: item.id,
                                            image: {
                                                id: item.nameId
                                            },
                                            health: f( originItem['health'] ),
                                            fire: {
                                                weaponId: f( originItem['weapon_id'] ),
                                                damage: f( originItem['health'] ) / 10,
                                                density: f( originItem['density'] ) * 1.5,
                                                speed: f( originItem['speed'] ) * 1.5
                                                /*
                                                damage: f( originItem['weapon_damage'] ),
                                                density: f( originItem['weapon_density'] ),
                                                speed: f( originItem['weapon_speed'] ),
                                                */
                                            },
                                            sounds: {
                                                pain: data['sounds']['pain'],
                                                death: data['sounds']['death'],
                                                idle: data['sounds']['idle']
                                            },
                                            physics: {
                                                maxSpeed: f( originItem['speed'] ),
                                                minSpeed: f( originItem['speed'] ) / 3,
                                                density: f( originItem['density'] ),
                                                forcePower: f( originItem['power'] ),
                                                inversePower: f( originItem['power'] ) * 1.5,
                                                fly: f( originItem['fly'] )
                                            }
                                        };
                                        if(data['physics']){
                                            var physics = item.actorParams.physics;
                                            if(data['physics']['radiusScale']){
                                                physics.radiusScale = f( data['physics']['radiusScale'] );
                                            }
                                            if(data['physics']['aimOnDamage']){
                                                physics.aimOnDamage = data['physics']['aimOnDamage'];
                                            }
                                            if(data['physics']['aimIntervalSec']){
                                                physics.aimIntervalSec = data['physics']['aimIntervalSec'];
                                            }
                                            if(data['physics']['aimDurationSec']){
                                                physics.aimDurationSec = data['physics']['aimDurationSec'];
                                            }
                                            if(data['physics']['pathWalkDurationSec']){
                                                physics.pathWalkDurationSec = data['physics']['pathWalkDurationSec'];
                                            }
                                            if(data['physics']['inverseDurationSec']){
                                                physics.inverseDurationSec = data['physics']['inverseDurationSec'];
                                            }
                                        }
                                        // cm.log('SETUP MONSTER', item);
                                    }else if(type_id == cm.consts.ITEM_TYPE_ARTEFACT
                                                || type_id == cm.consts.ITEM_TYPE_ARMOR)
                                    {
                                        item.weapon_damage_p = f( originItem['weapon_damage_p'] );
                                        item.weapon_frequency_p = f( originItem['weapon_frequency_p'] );
                                        item.weapon_speed_p = f( originItem['weapon_speed_p'] );
                                        item.weapon_density_p = f( originItem['weapon_density_p'] );
                                        item.weapon_fire_type = originItem['weapon_fire_type'];
                                        item.player_armor_p = f( originItem['player_armor_p'] );
                                        item.player_health_p = f( originItem['player_health_p'] );
                                        item.player_speed_p = f( originItem['player_speed_p'] );
                                        item.monster_health_p = f( originItem['monster_health_p'] );
                                        item.monster_speed_p = f( originItem['monster_speed_p'] );
                                        item.actorParams = {
                                            itemId: item.id,
                                            image: {
                                                id: item.nameId
                                            }
                                        };
                                    }else if(type_id == cm.consts.ITEM_TYPE_WEAPON){
                                        item.frequency = f( cm.param(originItem['frequency'], 2) );
                                        item.actorParams = {
                                            itemId: item.id,
                                            image: {
                                                id: item.nameId
                                            },
                                            damage: cm.max(1, f( originItem['damage'] )),
                                            damageCount: cm.max(1, f( originItem['damage_count'] )),
                                            traceCount: cm.max(1, f( originItem['trace_count'] )),
                                            through: f( originItem['through'] ),
                                            coverPercentage: cm.clamp( f( originItem['cover_p'] ), 2, 100 ),
                                            sounds: {
                                                shot: data['sounds']['shot']
                                            },
                                            physics: {
                                                speed: cm.max(10, f( originItem['speed'] )),
                                                density: cm.max(0.1, f( originItem['density'] ))
                                            }
                                        };
                                    }else if(type_id == cm.consts.ITEM_TYPE_MEDAL
                                                || type_id == cm.consts.ITEM_TYPE_OBJECT)
                                    {
                                        if(type_id == cm.consts.ITEM_TYPE_MEDAL){
                                            playerData.medalsByOrder.push(item);
                                        }
                                        item.actorParams = {
                                            // order: item.order,
                                            itemId: item.id,
                                            image: {
                                                id: item.nameId
                                            }
                                        };
                                    }
                                });
                            });
                            playerData.medalsByOrder.sort(function(a, b){
                               return a.order - b.order;
                            });
                            for(var i = 0; i < playerData.medalsByOrder.length; i++){
                                playerData.medalsByOrder[i].actorParams.medalNum = i+1;
                            }
                            // [begin debug]
                            if(cm.logEnabled) cm.log('medalsByOrder', playerData.medalsByOrder);
                            // cm.log('parsed items', cm.playerData.itemsByTypeId);
                            // console.log('playerData', playerData);
                            // [end debug]
                            this.nextStep();
                        },

                        function loadLevelData(){
                            var self = this;

                            this.progress({i:curItem++, name:'level data'});

                            cm.ajaxCrypt(urls['loadLevelData'], {
                                'level': level,
                                'invasion': invasion,
                                'day': day
                            }, function(data){
                                if(!cm.use_map_shape_debug){
                                    loadImages.splice(0, 0,
                                        // { id: 'level-background', url: cm.use_level2_map ? 'images/temp/level-2.png' : 'images/temp/test-level.png' }
                                        {id: 'level-background', url: data['image_url']}
                                    );
                                }
                                tiledMap = data['tiled_map'];
                                maxMedalNum = data['max_medal_num'];
                                dayParams = data['day_params'];
                                musics = data['musics'];
                                cm.playerData.levels = data['levels_opened'];
                                // [begin debug]
                                if(cm.logEnabled) cm.log('maxMedalNum', maxMedalNum);
                                // [end debug]

                                cm.playerData.defaultWeaponItem = cm.playerData.itemsById[data['default_weapon_id']];
                                if(cm.playerData.defaultWeaponItem && cm.playerData.defaultWeaponItem.typeId != cm.consts.ITEM_TYPE_WEAPON){
                                    cm.playerData.defaultWeaponItem = undefined;
                                }
                                // [begin debug]
                                if(cm.logEnabled) cm.log('defaultWeaponItem', cm.playerData.defaultWeaponItem, data['default_weapon_id']);
                                // [end debug]

                                cm.playerData.armorItem = cm.playerData.itemsById[data['armor_id']];
                                if(cm.playerData.armorItem && cm.playerData.armorItem.typeId != cm.consts.ITEM_TYPE_ARMOR){
                                    cm.playerData.armorItem = undefined;
                                }
                                // [begin debug]
                                if(cm.logEnabled) cm.log('armorItem', cm.playerData.armorItem, data['armor_id']);
                                // [end debug]

                                self.nextStep();
                            }, function(){
                                // error handler
                                self.failed = true;
                            });
                        },

                        function musicPhase(){
                            var count = this.steps.length - 2 + loadImages.length + loadSounds.length;
                            // -2 is (cacheSounds + end step)

                            this.progress({i:curItem++, count:count, name:'music'});

                            cm.musicList = musics;
                            // cm.startMusic(cm.round(cm.randRange(0, musics.length-1)));
                            cm.playMusic(0);

                            cm.each(["3", "2", "1", "begin", "tamed_monsters"], function(i, id){
                                if(cm.sound.register(id)){
                                    // cm.log('[player sound] load '+id);
                                }
                            });

                            this.nextStep();
                        },

                        function cacheSounds(){
                            var self = this;
                            var loadedSoundsNumber = 0;
                            function loadSingleSound()
                            {
                                if(self.failed){
                                    return;
                                }
                                if(loadedSoundsNumber < loadSounds.length){
                                    var sound = loadSounds[loadedSoundsNumber++];
                                    // cm.log('loading sound '+loadedSoundsNumber+' of '+loadSounds.length+' '+sound);

                                    self.progress({i:curItem++, name:sound});
                                    self.startTimeout();

                                    cm.sound.register(sound);
                                    setTimeout(function(){
                                        loadSingleSound();
                                    }, 30);
                                }else{
                                    self.nextStep();
                                }
                            };
                            loadSingleSound();
                        },

                        function cacheImages(){
                            var self = this;

                            for(var i = 0; i < loadImages.length; i++){
                                loadImages[i].url = loadImages[i].url .. '?' .. cm.consts.IMAGES_VERSION;
                            }

                            self.progress({i:curItem++, name:'images'});
                            self.startTimeout();

                            var loaded = []
							var loadedIndex = 0
							var maxSteps = 30
							var maxTime = 2000
							var dt = 100
							var timer;
                            var steps = cm.min(loadImages.length, maxSteps)
							var stepCount = cm.ceil(loadImages.length / steps);
                            if(steps * dt > maxTime){
                                dt = maxTime / steps;
                            }
                            function showLoadingProgress(){
                                for(var i = 0; i < stepCount && loadedIndex < loaded.length; i++){
                                    var image = loadImages[ loaded[loadedIndex++] ];
                                    self.progress({i:curItem++, name:image.id});

                                    if(loadedIndex == loadImages.length){
                                        clearInterval(timer);
                                        setTimeout(function(){self.nextStep();}, 100);
                                        break;
                                    }
                                }
                            };
                            timer = setInterval(showLoadingProgress, dt);

                            function imageLoaded(counter, images, i, failed){
                                if(self.failed){ // is it general fail
                                    // [begin debug]
                                    if(cm.logEnabled) cm.log('image loading failed');
                                    // [end debug]
                                    return;
                                }
                                if(failed){
                                    // [begin debug]
                                    if(cm.logEnabled) cm.log('ERROR IMAGE LOADING', images[i].image.src);
                                    // [end debug]
                                    // do not break, skip error
                                    // TODO: load dummy image?
                                }
                                loaded.push(i);

                                // var image = images[i];
                                // self.progress({i:curItem++, name:image.id});
                                self.startTimeout();

                                if(counter == loadImages.length){
                                    cm.director.imagesCache = images;
                                    // self.nextStep();
                                }
                            };

                            /*new*/ CAAT.ImagePreloader().loadImages(loadImages, imageLoaded, function(counter, images, i){
                                imageLoaded(counter, images, i, "failed");
                            });

                            /*
                            var loadedImages = [], loadedImagesNumber = 0;
                            var imageLoader = new CAAT.ImagePreloader();
                            curItem++;
                            (function loadSingleImage()
                            {
                                if(self.failed){
                                    return;
                                }
                                if(loadedImagesNumber < loadImages.length){
                                    var image = loadImages[loadedImagesNumber++];
                                    // cm.log('loading image '+loadedImagesNumber+' of '+loadImages.length+' '+image.id);

                                    self.progress({i:curItem++, name:image.id});
                                    self.startTimeout();

                                    imageLoader.loadImages([image], function(counter, images){
                                        loadedImages.push(images[0]);
                                        loadSingleImage();
                                    }, function(counter, images){ // error callback
                                        console.log('IMAGE ERROR', images[0].image.src);
                                        loadedImages.push(images[0]);
                                        loadSingleImage();
                                    });
                                }else{
                                    cm.director.imagesCache = loadedImages;
                                    self.nextStep();
                                }
                            })();
                            */
                        },

                        function(){
                            // [begin debug]
                            if(cm.logEnabled) cm.log('starting');
                            // [end debug]
                            this.progress({i:curItem++, name:'starting'});

                            cm.director.loop(30);

                            var scene = /*new*/ cm.LevelScene().create(cm.director, tiledMap, dayParams, level, invasion, day, maxMedalNum);
                            cm.director.addScene(scene);

                            var pauseTimer = setTimeout(function(){
                                cm.paused = true;
                            }, 1500);

                            setTimeout(function(){
                                callbacks['endLoading'](function(){
                                    callbacks['countDown'](3,
                                        function(cur){
                                            // [begin debug]
                                            if(cm.logEnabled) cm.log('countdown '+cur);
                                            // [end debug]
                                            cm.sound.play({sound:[cur], volume:100});
                                        },
                                        function(){
                                            clearTimeout(pauseTimer);
                                            cm.paused = false;
                                            cm.sound.play({sound:["begin"], volume:100});
                                            callbacks['gameStarted']();
                                        }
                                    )
                                });
                            }, 500);
                        }
                    ]});
                });
			};

			if(cm.sound_enabled = game.config.sound_enabled){
				soundManager.url = game.config.url.sm_swf;
				soundManager.flashVersion = 9; // optional: shiny features (default = 8)
				// soundManager.useFlashBlock = false; // optionally, enable when you're ready to dive in
				// soundManager.useFlashBlock = false; // optionally, enable when you're ready to dive in
				// soundManager.useFlashBlock = true;
				soundManager.debugFlash = false;
				soundManager.debugMode = false;
				// soundManager.waitForWindowLoad = true;
				soundManager.useHTML5Audio = false;
				soundManager.preferFlash = true;
				soundManager.audioFormats.mp3.required = false;

				/*
				 * read up on HTML5 audio support, if you're feeling adventurous.
				 * iPad/iPhone and devices without flash installed will always attempt to use it.
				*/
				soundManager.onready(function() {
					// Ready to use; soundManager.createSound() etc. can now be called.
					cm.sound.formats.mp3 = soundManager.canPlayURL('dummy.mp3');
					cm.sound.formats.ogg = soundManager.canPlayURL('dummy.ogg');
					cm.sound.formats.wav = soundManager.canPlayURL('dummy.wav');
					// [begin debug]
                    if(cm.logEnabled) cm.log('soundManager.onready', cm.sound.formats);
                    // [end debug]
					loadGame();
				});
				soundManager.ontimeout(function() {
					// SM2 could not start. Flash blocked, missing or security error? Complain, etc.?
					// [begin debug]
                    if(cm.logEnabled) cm.log('soundManager.ontimeout');
                    // [end debug]
					loadGame();
				});
			}else{
				loadGame();
			}

			return this;
		},

		physics: {

			TO_VIEW_SCALE: 10.0,
			DEF_ROTATION_ENABLED: false,
			DEF_LINEAR_DAMPING: 0.02,
			DEF_ANGULAR_DAMPING: 0.02,
			DEF_RESTITUTION: 0.0, // 1.0,
			DEF_FRICTION: 0.02,
			DEF_DENSITY: 1.0,

			CAT_BIT_ALL: 			0xFFFF,
			CAT_BIT_PLAYER: 		1<<0,
			CAT_BIT_MONSTER:		1<<1,
			CAT_BIT_PLAYER_FIRE:	1<<2,
			CAT_BIT_POWERUP:		1<<3,
			CAT_BIT_STATIC:			1<<4,
			CAT_BIT_HOLE:			1<<5,
			CAT_BIT_MONSTER_AREA:	1<<6,
			CAT_BIT_ENVIRONMENT: 	1<<7,
			CAT_BIT_MONSTER_FIRE: 	1<<8,
			CAT_BIT_BLOOD:			1<<9,

			CAT_BIT_MONSTER_SPAWN:	1<<16,
			CAT_BIT_PLAYER_SPAWN:	1<<17,

			physScalarToView: function(x, round){
				if(round){
					return cm.round(x * this.TO_VIEW_SCALE);
				}
				return x * this.TO_VIEW_SCALE;
			},

			physVecToView: function(vec, round){
				var x = vec.x * this.TO_VIEW_SCALE;
				var y = vec.y * this.TO_VIEW_SCALE;
				if(round){
					x = cm.round(x);
					y = cm.round(x);
				}
				return /*new*/ cm.Point(x, y);
			},

			physAngleToView: function(a){
				return a;
			},

			viewToPhysScalar: function(x){
				return x / this.TO_VIEW_SCALE;
			},

			viewToPhysVec: function(point){
				return /*new*/ b2Vec2(point.x / this.TO_VIEW_SCALE, point.y / this.TO_VIEW_SCALE);
			},

			viewXYToPhysVec: function(x, y){
				return /*new*/ b2Vec2(x / this.TO_VIEW_SCALE, y / this.TO_VIEW_SCALE);
			},

			viewToPhysAngle: function(a){
				return a;
			},

			linkPhysBodyToActor: function(physicsBody, actor){
				actor.physicsBody = physicsBody;
				physicsBody.actor = actor;
			},

			applyActorToPhysicsBody: function(actor){
				if(actor.physicsBody){
					var p = this.viewXYToPhysVec( actor.x + actor.width/2, actor.y + actor.height/2 );
					var angle = this.viewToPhysAngle( actor.rotationAngle );

					// make some transform here

					actor.physicsBody.SetOriginPosition( p, angle );

					p.x = 0;
					p.y = 0;
					actor.physicsBody.SetLinearVelocity( p );
				}
			},

			applyPhysicsBodyToActor: function(physicsBody){
				var actor = physicsBody.actor;
				if(actor){
					var p = this.physVecToView( physicsBody.GetOriginPosition() );
					var angle = this.physAngleToView( physicsBody.GetRotation() );

					// make some transform here

					actor.setLocation(
							(p.x - actor.width/2)|0,
							(p.y - actor.height/2)|0 );
					actor.setRotation( angle );
				}
			},

			applyWorldToActors: function(world){
				for (var b = world.m_bodyList; b; b = b.m_next) {
					this.applyPhysicsBodyToActor(b);
				}
			},

			drawWorld: function (world, context) {
				for (var j = world.m_jointList; j; j = j.m_next) {
					this.drawJoint(j, context);
				}
				for (var b = world.m_bodyList; b; b = b.m_next) {
					for (var s = b.GetShapeList(); s != null; s = s.GetNext()) {
						this.drawShape(s, context);
					}
				}
			},

			drawJoint: function (joint, context) {
				var b1 = joint.m_body1;
				var b2 = joint.m_body2;
				var x1 = this.physVecToView( b1.m_position );
				var x2 = this.physVecToView( b2.m_position );
				var p1 = this.physVecToView( joint.GetAnchor1() );
				var p2 = this.physVecToView( joint.GetAnchor2() );
				context.strokeStyle = '#00eeee';
				context.beginPath();
				if(joint.m_type == b2Joint.e_distanceJoint){
					context.moveTo(p1.x, p1.y);
					context.lineTo(p2.x, p2.y);
				}elseif(joint.m_type == b2Joint.e_pulleyJoint){
					// TODO
				}else{
					if (b1 == world.m_groundBody) {
						context.moveTo(p1.x, p1.y);
						context.lineTo(x2.x, x2.y);
					}
					else if (b2 == world.m_groundBody) {
						context.moveTo(p1.x, p1.y);
						context.lineTo(x1.x, x1.y);
					}
					else {
						context.moveTo(x1.x, x1.y);
						context.lineTo(p1.x, p1.y);
						context.lineTo(x2.x, x2.y);
						context.lineTo(p2.x, p2.y);
					}
				}
				context.stroke();
			},

			drawCircle: function(context, color, pos, r, ax) {
				context.strokeStyle = color;
				context.beginPath();

				var segments = 16.0;
				var theta = 0.0;
				var dtheta = 2.0 * Math.PI / segments;
				// draw circle
				context.moveTo(pos.x + r, pos.y);
				for (var i = 0; i < segments; i++) {
					var dx = r * Math.cos(theta);
					var dy = r * Math.sin(theta);
					context.lineTo(pos.x + dx, pos.y + dy);
					theta = theta + dtheta;
				}
				context.lineTo(pos.x + r, pos.y);

				if(ax !== undefined){
					// draw radius
					context.moveTo(pos.x, pos.y);
					context.lineTo(pos.x + r * ax.x, pos.y + r * ax.y);
				}

				context.stroke();
			},

			drawShape: function (shape, context) {
				if(shape.m_type == b2Shape.e_circleShape){
					var circle = shape;
					var pos = this.physVecToView( circle.m_position );
					var r = this.physScalarToView( circle.m_radius );
					this.drawCircle(context, shape.IsSensor() ? '#5050ff' : '#ffffff', pos, r, circle.m_R.col1);
					/*
					var segments = 16.0;
					var theta = 0.0;
					var dtheta = 2.0 * Math.PI / segments;
					// draw circle
					context.moveTo(pos.x + r, pos.y);
					for (var i = 0; i < segments; i++) {
						var dx = r * Math.cos(theta);
						var dy = r * Math.sin(theta);
						context.lineTo(pos.x + dx, pos.y + dy);
						theta += dtheta;
					}
					context.lineTo(pos.x + r, pos.y);

					// draw radius
					context.moveTo(pos.x, pos.y);
					var ax = circle.m_R.col1;
					context.lineTo(pos.x + r * ax.x, pos.y + r * ax.y);
					*/
				}elseif(shape.m_type == b2Shape.e_polyShape){
					context.strokeStyle = shape.IsSensor() ? '#5050ff' : '#ffffff';
					context.beginPath();

					var poly = shape;
					var tV = this.physVecToView( b2Math.AddVV(poly.m_position, b2Math.b2MulMV(poly.m_R, poly.m_vertices[0])) );
					context.moveTo(tV.x, tV.y);
					for (var i = 0; i < poly.m_vertexCount; i++) {
						var v = this.physVecToView( b2Math.AddVV(poly.m_position, b2Math.b2MulMV(poly.m_R, poly.m_vertices[i])) );
						context.lineTo(v.x, v.y);
					}
					context.lineTo(tV.x, tV.y);

					context.stroke();
				}
			}
		},

		/*
		extend: function(a, b){
			// return $.extend.apply($, [true].concat(arguments));
			return $.extend(true, {}, a, b);
		},
		*/

		extend: function(a, b, clone_result){
			if(b === undefined || b === null){
				return this.clone(a);
			}
			if((typeof b == "object") != (typeof a == "object")){
				return this.clone(b);
			}
			if(clone_result === undefined || clone_result){
				a = this.clone(a);
			}
			var self = this;
			this.each(b, function(key, item, is_object){
				if(!is_object || b.hasOwnProperty(key))
				{
					if(typeOf(item) == "object"){
						var val;
						if((val = a[key]) && typeOf(val) == "object"){
							a[key] = self.extend(val, item, false);
						}else{
							a[key] = self.clone(item);
						}
					}else{
						a[key] = item;
					}
				}
			});
			return a;
		},

		clone: function(a) {
			// return $.extend(true, {}, a);

			if(a === undefined || a === null || typeOf(a) != 'object'){
				return a;
			}
			if(a.constructor == Array){
			// if(a instanceof Array){
				// cm.log('clone array', a);
				return [].concat(a);
			}

			var temp = /*new*/ a.constructor();
			for(var key in a){
				if(a.hasOwnProperty(key)){
					temp[key] = this.clone(a[key]);
				}
			}
			return temp;
		},

		each: function(obj, func){
			if(obj === undefined){
				// skip
			}else if(typeOf(obj) == "array"){
				for(var i = 0; i < obj.length; i++){
					func(i, obj[i], false);
				}
			}else if(typeOf(obj) == "object"){
				for(var i in obj){
					func(i, obj[i], true);
				}
			}else{
				func(undefined, obj, false);
			}
		},

		isIdentical: function (a, b, sort_arrays){
			/* Requires ECMAScript 5 functions:
				   - Array.isArray()
				   - Object.keys()
				   - JSON.stringify()
			*/
			function sort(object) {

				if (sort_arrays === true && Array.isArray(object)) {
					return object.sort();
				}
				else if (typeOf(object) !== "object" || object === null) {
					return object;
				}

				var result = {};

				cm.each(Object.keys(object).sort(), function(key) {
					result[key] = sort(this); // object[key]);
				});

				return result;
			};

			return JSON.stringify(sort(a)) === JSON.stringify(sort(b));
		},

		param: function(){
			// cm.log("[param] "+arguments.length);
			// for(var i in arguments){
			for(var i = 0; i < arguments.length; i++){
				var arg = arguments[i];
				if(arg !== undefined){
					return arg;
				}
			}
			return undefined;
		},

		makeEnum: function(){
			var r = {};
			// for(var i in arguments){
			for(var i = 0; i < arguments.length; i++){
				r[ arguments[i] ] = i;
			}
			if(r.count === undefined){
				r.count = arguments.length;
			}
			if(r.COUNT === undefined){
				r.COUNT = arguments.length;
			}
			return r;
		},

		dump: function(arr, level) {
			// cm.log("my object: %o", arr);
			// return "";

			var dumped_text = "";
			if(!level) level = 0;

			//The padding given at the beginning of the line.
			var level_padding = "";
			for(var j=0;j<level+1;j++) level_padding = level_padding .. "    ";

			if(typeof(arr) == 'object') { //Array/Hashes/Objects
				cm.each(arr, function(item, value){
					if(typeof(value) == 'object') { //If it is an array,
						dumped_text = dumped_text .. level_padding .. "'" .. item .. "' ...\n";
						dumped_text = dumped_text .. this.dump(value,level+1);
					} else {
						dumped_text = dumped_text .. level_padding .. "'" .. item .. "' => \"" .. value .. "\"\n";
					}
				});
			} else { //Strings/Chars/Numbers etc.
				dumped_text = "===>" .. arr .. "<===(" .. typeOf(arr) .. ")";
			}
			return dumped_text;
		},

		// Math functions

		round: function(a, d){
			if(!d){ // d === undefined || d == 0){
				return Math.round(a);
			}
			if(d > 0){
				var mult = 10;
				for(;--d > 0;){
					mult = mult*10;
				}
				return Math.round(a * mult) / mult;
			}
			var mult = 10;
			for(;++d < 0;){
				mult = mult*10;
			}
			return Math.round(a / mult) * mult;
		},

		roundPoint: function(p, d){
			return /*new*/ cm.Point( cm.round(p.x, d), cm.round(p.y, d) );
		},

		abs: Math.abs,
		max: Math.max,
		min: Math.min,
		floor: Math.floor,
		ceil: Math.ceil,
		sqrt: Math.sqrt,

		clamp: function(a, min, max){
			if(a < min) return min;
			if(a > max) return max;
			return a;
		},

		toFloat: function(a){return (a || 0) * 1;},

		rand: function(){
			return Math.random();
		},

		randRange: function(min, max){
			if(max === undefined){
				max = min[1];
				min = min[0];
			}
			return min + (max - min) * this.rand();
		},

		randSign: function(){
			return this.rand() * 2 - 1;
		},

		randItem: function(obj){
			if(obj && obj is Array){
				return obj[ this.round(this.randRange(0, obj.length-1)) ];
			}
			var keys = [];
			for(var i in obj){
				keys.push(i);
			}
			return obj[ keys[this.round(this.randRange(0, keys.length-1))] ];
		},

		randTimeMS: function(time, scale){
			if(!scale){ // scale === undefined){
				scale = 1000;
			}
			if(time[0] !== undefined){
				return Math.ceil(this.randRange(time) * scale);
			}
			return Math.ceil(time * (1 + cm.randSign()*0.1) * scale);
		},

		randAreaPos: function(area, edge){
			if(edge === undefined){
				edge = 0;
			}
			var x = cm.round( cm.randRange(area.x - edge, area.x + area.width + edge) );
			var y = cm.round( cm.randRange(area.y - edge, area.y + area.height + edge) );
			return /*new*/ cm.Point( x, y );
		},

		getActorCenter: function(actor){
			return /*new*/ cm.Point(
					actor.x + actor.width / 2,
					actor.y + actor.height / 2
				);
		},

		getActorsDistance: function(actor1, actor2){
			var p1 = this.getActorCenter(actor1);
			var p2 = this.getActorCenter(actor2);
			return p1.subtract(p2).getLength();
		},

		deleteActor: function(actor){
			/* if(actor.physicsBody !== undefined){
				var physicsWorld = actor.level.physics.world;
				physicsWorld.DestroyBody( actor.physicsBody );
				actor.physicsBody = undefined;
			} */
			actor.setDiscardable( true ).setExpired( true );
		},

		isActorDead: function(actor){
			if(!actor || actor.expired){
				return true;
			}
			return false;
			/*
				actor.desc
				&& actor.desc.health
				&& actor.damaged + actor.desc.health * (1 - cm.playerData.effects.scale.monsterHealth) >= actor.desc.health;
			*/
		},

		dieActor: function(actor, changeFPS){
			if(actor.sprite !== undefined
					&& actor.desc.image.size !== undefined
					&& actor.desc.image.size[0] >= 20){
				// cm.log("[die phase] "+actor.desc.image.size[0]);

				var s = actor.sprite;
				if(changeFPS === undefined){
					changeFPS = s.changeFPS;
				}
				var dieActor = /*new*/ CAAT.SpriteActor().create()
					.setSpriteImage( s.compoundbitmap )
					.setAnimationImageIndex( [17,18,19] )
					.setChangeFPS( changeFPS )
					.setBounds( actor.x, actor.y, actor.width, actor.height )
					.setFrameTime( actor.time, changeFPS * 3 )
					.setDiscardable( true )
					;
				dieActor.addListener({
						actorLyfeCycleEvent: function( actor, eventType, time ){
							// cm.log("[actor life event] "+eventType);
							if(eventType == "destroyed"){
								if(actor.onDestroy){
									actor.onDestroy();
								}
							}
						}
					});
				dieActor.level = actor.level;
				dieActor.desc = actor.desc;
				actor.dieActor = dieActor;
				actor.parent.addChild(dieActor);
			}
			cm.deleteActor( actor );
		},

		createActor: function(level, constructor, params){
			var actor = /*new*/ constructor().create();
			actor.level = level;
			// cm.log('[createActor] setupActor');
			return cm.setupActor(actor, params);
		},

		setupActor: function(actor, params){
			var physicsWorld = actor.level.physics.world;

			// cm.log('[setupActor] clone params');
			// actor.desc = cm.clone(params);
			actor.desc = params; // cm.clone(params);

			actor.setGlobalAlpha(true);

			var shapeActor = null;
			if( (params.shape === undefined || params.shape)
					&& (params.fillStyle !== undefined || params.strokeStyle !== undefined)
					){
				shapeActor = actor;
				if(actor.setShape === undefined){
					// cm.log("[setupActor] add ShapeActor");
					shapeActor = /*new*/ CAAT.ShapeActor().create();
					actor.addChild(shapeActor);
				}
				if(params.fillStyle !== undefined){
					shapeActor.setFillStyle(params.fillStyle);
				}
				if(params.strokeStyle !== undefined){
					shapeActor.setStrokeStyle(params.strokeStyle);
				}
				if(params.alpha !== undefined){
					shapeActor.setAlpha(params.alpha);
				}
			}

            var imageSrc;
			if(params.imageBackground !== undefined && actor.addChild !== undefined){
				imageSrc = cm.director.getImage(params.imageBackground.imageId || params.imageBackground.id);
				if(!imageSrc){
					// [begin debug]
                    if(cm.logEnabled) cm.log("Image background '"+(params.imageBackground.imageId || params.imageBackground.id)+"' is not loaded!");
                    // [end debug]
				}
				if(params.imageBackground.size === undefined){
					var imageBackground = /*new*/ CAAT.ImageActor().create();
					imageBackground.setImage(imageSrc);
					actor.addChild(imageBackground);
                    actor.imageBackground = imageBackground;
				}
            }

			if(params.image !== undefined && actor.addChild !== undefined){
				imageSrc = cm.director.getImage(params.image.imageId || params.image.id);
				if(!imageSrc){
                    // [begin debug]
					if(cm.logEnabled) cm.log("Image '"+(params.image.imageId || params.image.id)+"' is not loaded!");
                    // [end debug]
				}
				if(params.image.size === undefined){
					var image = /*new*/ CAAT.ImageActor().create();
					image.setImage(imageSrc);
					actor.addChild(image);

					if(params.width == undefined){
						params.width = image.width;
					}
					if(params.height == undefined){
						params.height = image.height;
					}
				}else{
					var compoundImage = null;
					if(params.image.compoundImage === undefined){
						compoundImage = /*new*/ CAAT.CompoundImage()
							.initialize( imageSrc, params.image.size[1], params.image.size[0] );
					}else{
						compoundImage = params.image.compoundImage;
					}
					actor.sprite = /*new*/ CAAT.SpriteActor().create()
							.setSpriteImage( compoundImage )
							.setAnimationImageIndex( params.image.animation === undefined ? [0, 0] : params.image.animation )
							.setChangeFPS( params.image.ms )
							;
					actor.addChild( actor.sprite );

					if(params.width == undefined){
						params.width = compoundImage.singleWidth;
					}
					if(params.height == undefined){
						params.height = compoundImage.singleHeight;
					}
				}
			}

			if(params.radiusScale !== undefined){
				if(params.radius === undefined){
					params.radius = cm.max( params.width, params.height ) / 2;
				}
				params.radius = params.radius * params.radiusScale;
			}
			if(params.radius > 0){
				if(shapeActor){
					shapeActor.setShape( CAAT.ShapeActor.prototype.SHAPE_CIRCLE );
				}

				if(params.anchor !== undefined){
					actor.setSize( params.radius * 2, params.radius * 2 );
					var anchor = actor.getAnchor( params.anchor );
					actor.setLocation(
							params.location.x - anchor.x,
							params.location.y - anchor.y );
				}else if(params.center){
					actor.setBounds(
							params.center.x - params.radius,
							params.center.y - params.radius,
							params.radius * 2, params.radius * 2 );
				}else{
					actor.setBounds(
							params.location !== undefined ? params.location.x : params.x,
							params.location !== undefined ? params.location.y : params.y,
							params.radius * 2, params.radius * 2 );
				}
			}else{
				if(shapeActor){
					shapeActor.setShape( CAAT.ShapeActor.prototype.SHAPE_RECTANGLE );
				}

				if(params.anchor !== undefined){
					actor.setSize( params.width, params.height );
					var anchor = actor.getAnchor( params.anchor );
					actor.setLocation(
							params.location.x - anchor.x,
							params.location.y - anchor.y );
				}else if(params.center){
					actor.setBounds(
							params.center.x - params.width/2,
							params.center.y - params.height/2,
							params.width, params.height );
				}else{
					actor.setBounds(
							params.location !== undefined ? params.location.x : params.x,
							params.location !== undefined ? params.location.y : params.y,
							params.width, params.height );
				}
			}
			if(shapeActor && actor != shapeActor){
				shapeActor.setBounds( 0, 0, actor.width, actor.height );
			}
            if(imageBackground !== undefined){
                imageBackground.setLocation(
                    (actor.width - imageBackground.width)/2,
                    (actor.height - imageBackground.height)/2
                );
            }

			if(params.spawnOffs){
				if(params.spawnOffs.x !== undefined){
					actor.x = actor.x + spawnOffs.x;
					actor.y = actor.y + spawnOffs.y;
				}else{
					if(params.targetDir === undefined){
                        // [begin debug]
                        if(cm.logEnabled) cm.log('!params.targetDir ', params);
                        // [end debug]
                    }
					actor.x = actor.x + params.targetDir.x * params.spawnOffs;
					actor.y = actor.y + params.targetDir.y * params.spawnOffs;
				}
			}

			if(params.angle !== undefined){
				actor.setRotation(params.angle);
			}else if(params.targetDir !== undefined){
				params.angle = /*new*/ cm.Point(params.targetDir.x, params.targetDir.y).getAngle();
				actor.setRotation( params.angle );
			}

			if(params.physics !== undefined){
				var param = cm.param;

				var bodyDef = /*new*/ b2BodyDef();
				bodyDef.preventRotation = !param( params.physics.rotationEnabled, cm.physics.DEF_ROTATION_ENABLED );
				bodyDef.linearDamping = param( params.physics.linearDamping, cm.physics.DEF_LINEAR_DAMPING );
				bodyDef.angularDamping = param( params.physics.angularDamping, cm.physics.DEF_ANGULAR_DAMPING );

				var addShapeDef = function(physics){
					var shapeDef = null;

					if(physics.radiusScale !== undefined){
						if(physics.radius === undefined){
							if(params.radius === undefined){
								physics.radius = cm.max( params.width, params.height ) / 2;
							}else{
								physics.radius = params.radius;
							}
						}
						physics.radius = physics.radius * physics.radiusScale;
					}

					var radius = param(physics.radius, params.radius);
					if( radius !== undefined ){
						shapeDef = /*new*/ b2CircleDef();
						shapeDef.radius = cm.physics.viewToPhysScalar( radius );
					}else{
						shapeDef = /*new*/ b2BoxDef();
						shapeDef.extents = cm.physics.viewXYToPhysVec(
								param(physics.width, params.width) / 2,
								param(physics.height, params.height) / 2 );
						if(physics.widthScale !== undefined){
							shapeDef.extents.x = shapeDef.extents.x * physics.widthScale;
						}
						if(physics.heightScale !== undefined){
							shapeDef.extents.y = shapeDef.extents.y * physics.heightScale;
						}
					}

					shapeDef.density = param( physics.density, params.physics.density, cm.physics.DEF_DENSITY );
					shapeDef.restitution = param( physics.restitution, params.physics.restitution, cm.physics.DEF_RESTITUTION );
					shapeDef.friction = param( physics.friction, params.physics.friction, cm.physics.DEF_FRICTION );

					if( param( physics.sensor, params.physics.sensor ) ){
						shapeDef.isSensor = true;
						// cm.log("[shapeDef] sensor");
					}
					var categoryBits = param( physics.categoryBits, params.physics.categoryBits );
					if( categoryBits !== undefined ){
						shapeDef.categoryBits = categoryBits;
					}
					var maskBits = param( physics.maskBits, params.physics.maskBits );
					if( maskBits !== undefined ){
						shapeDef.maskBits = maskBits;
					}
					var ignoreBits = param( physics.ignoreBits, params.physics.ignoreBits );
					if( ignoreBits !== undefined ){
						shapeDef.maskBits = shapeDef.maskBits & ~ignoreBits;
					}
					if(physics.fly){
						shapeDef.maskBits = shapeDef.maskBits & ~cm.physics.CAT_BIT_HOLE;
					}

					bodyDef.AddShape( shapeDef );
				};

				if( params.physics.shapes !== undefined ){
					// cm.log("[shapeDef] count: "+params.physics.shapes.length);
					/* cm.forEach(params.physics.shapes, function(shape){
						addShapeDef(shape);
					}); */
					cm.each(params.physics.shapes, function(i, shape){
						addShapeDef(shape);
					});
				}else{
					addShapeDef( params.physics );
				}

				var body = physicsWorld.CreateBody(bodyDef);
				cm.physics.linkPhysBodyToActor( body, actor );
				cm.physics.applyActorToPhysicsBody( actor );
				// cm.physics.applyPhysicsBodyToActor( body );

				if(params.physics.speed !== undefined){
					if(params.targetDir === undefined){
						params.targetDir = /*new*/ cm.Point(1, 0).setAngle( params.angle );
					}
					var physicsSpeed = cm.physics.viewToPhysVec(  /*new*/ cm.Point(params.targetDir.x, params.targetDir.y).multiply( params.physics.speed ) );
					actor.physicsBody.SetLinearVelocity( physicsSpeed );
				}
			}

			if(params.life !== undefined && params.life.behaviors !== undefined){
				var createContainerBehavior = function(params, depth){
					var container = /*new*/ CAAT.ContainerBehavior();
					var containerDuration = -1;

					var addBehavior = function(behavior, params){
						if(params.interpolator){
							var def = function(val, def){
								return val === undefined ? def : val;
							};

							var pingpong = (params.interpolator.pingpong || params.pingpong) ? true : false;
							params.pingpong = undefined;

							// var inverse = params.inverse;
							// params.inverse = undefined;

							var inter = null;
							var interpolator_type = params.interpolator.type
							if(interpolator_type == "linear"){
								var inverse = params.interpolator.inverse ? true : false;
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createLinearInterpolator(pingpong, inverse)
										);
							}else if(interpolator_type == "exp_in"){
								var exp = def(params.interpolator.exp, 2);
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createExponentialInInterpolator(exp, pingpong)
										);
							}else if(interpolator_type == "exp_out"){
								var exp = def(params.interpolator.exp, 2);
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createExponentialOutInterpolator(exp, pingpong)
										);
							}else if(interpolator_type == "exp_in_out"){
								var exp = def(params.interpolator.exp, 2);
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createExponentialInOutInterpolator(exp, pingpong)
										);
							}else if(interpolator_type == "bounce_in"){
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createBounceInInterpolator(pingpong)
										);
							}else if(interpolator_type == "bounce_out"){
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createBounceOutInterpolator(pingpong)
										);
							}else if(interpolator_type == "bounce_in_out"){
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createBounceInOutInterpolator(pingpong)
										);
							}else if(interpolator_type == "elastic_in"){
								var amp = def(params.interpolator.amp, 1.1);
								var d = def(params.interpolator.d, 0.4);
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createElasticInInterpolator(amp, d, pingpong)
										);
							}else if(interpolator_type == "elastic_out"){
								var amp = def(params.interpolator.amp, 1.1);
								var d = def(params.interpolator.d, 0.4);
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createElasticOutInterpolator(amp, d, pingpong)
										);
							}else if(interpolator_type == "elastic_in_out"){
								var amp = def(params.interpolator.amp, 1.1);
								var d = def(params.interpolator.d, 0.4);
								behavior.setInterpolator( /*new*/ CAAT.Interpolator()
											.createElasticInOutInterpolator(amp, d, pingpong)
										);
							}
						}
						if(params.pingpong){
							behavior.setPingPong();
						}
						if(params.cycle){
							behavior.setCycle( params.cycle );
						}
						if(params.start === undefined){
							params.start = 0;
						}
						if(params.duration === undefined){
							params.duration = containerDuration;
						}
						var isChild = container !== behavior;
						behavior.setFrameTime(
								params.start + (isChild ? 0 : actor.level.time),
								params.duration );

						if(isChild){
							containerDuration = cm.max(containerDuration,
									behavior.getStartTime() + behavior.getDuration());
							container.addBehavior( behavior );
						}
					};
					/*
					if(params.cycle){
						container.setCycle( params.cycle );
					}
					*/
					// cm.forEach(params.behaviors, function(b, i){
					cm.each(params.behaviors, function(i, b){
						if( (b.duration || 0) <= 0 ){
							return;
						}
						if(b.behaviors){
							// cm.log("[sub behaviors]");
							var behavior = createContainerBehavior(b, depth + 1);
							addBehavior(behavior, b);
						}
						if(b.alpha){
							var behavior = /*new*/ CAAT.AlphaBehavior();
							if(b.alpha[0] !== undefined){
								behavior.setValues( b.alpha[0], b.alpha[1] );
							}else{
								behavior.setValues( 1, 0 );
							}
							addBehavior(behavior, b);
						}
						if(b.path){
							// cm.log("[path] "+cm.dump(b.path));
							var behavior = /*new*/ CAAT.PathBehavior();

							var path = /*new*/ CAAT.Path();
							if(b.path.autoRotate !== undefined){
								behavior.setAutoRotate( b.path.autoRotate );
							}
							if(b.path.offs !== undefined){
								// cm.log("[path] offs: "+b.path.offs.x+" "+b.path.offs.y);
								behavior.setTranslation( b.path.offs.x, b.path.offs.y );
							}else if(b.path.anchor !== undefined){
								// cm.log("[path] anchor_id: "+b.path.anchor);
								var anchor = actor.getAnchor( b.path.anchor );
								// cm.log("[path] anchor: "+anchor.x+" "+anchor.y);
								behavior.setTranslation( anchor.x, anchor.y );
							}
							if(b.path.linear !== undefined){
								if( b.path.linear[0] == null ){
									b.path.linear[0] = {
										x: actor.x + behavior.translateX,
										y: actor.y + behavior.translateY
									};
								}
								path.setLinear(
										b.path.linear[0].x,
										b.path.linear[0].y,
										b.path.linear[1].x,
										b.path.linear[1].y);
							}else if(b.path.quadric){
								if( b.path.quadric[0] == null ){
									b.path.quadric[0] = {
											x: actor.x + behavior.translateX,
											y: actor.y + behavior.translateY
										};
								}
								path.setQuadric(
										b.path.quadric[0].x,
										b.path.quadric[0].y,
										b.path.quadric[1].x,
										b.path.quadric[1].y,
										b.path.quadric[2].x,
										b.path.quadric[2].y);
							}else if(b.path.cubic){
								if( b.path.cubic[0] == null ){
									b.path.cubic[0] = {
											x: actor.x + behavior.translateX,
											y: actor.y + behavior.translateY
										};
								}
								path.setCubic(
										b.path.cubic[0].x,
										b.path.cubic[0].y,
										b.path.cubic[1].x,
										b.path.cubic[1].y,
										b.path.cubic[2].x,
										b.path.cubic[2].y,
										b.path.cubic[3].x,
										b.path.cubic[3].y);
							}else{
								if(b.path.begin === undefined){
									path.beginPath( actor.x, actor.y );
								}else{
									path.beginPath( b.path.begin.x, b.path.begin.y );
								}
								path.endPath();
							}
							behavior.setPath( path );

							addBehavior(behavior, b);
						}
					});
					addBehavior(container, params);

					// cm.log("[container] "+params.start+" "+params.duration);
					return container;
				};
				var container = createContainerBehavior( params.life, 0 );
				container.addListener({
						behaviorExpired : function(behaviour, time, actor) {
							cm.deleteActor( actor );
						}
					});
				actor.addBehavior(container);

				if( params.spriteEffects !== undefined && actor.sprite ){
					var container = createContainerBehavior( params.spriteEffects, 0 );
					actor.sprite.addBehavior(container);
				}
			}

			actor.addListener({
				actorLyfeCycleEvent: function( actor, eventType, time ){
					// cm.log("[actor life event] "+eventType);
					if(eventType == "destroyed"){
						if(actor.physicsBody !== undefined){
							physicsWorld.DestroyBody( actor.physicsBody );
							actor.physicsBody = undefined;
						}
						if(actor.onDestroy !== undefined){
							actor.onDestroy();
						}
					}
				}
			});

			actor.damagedTime = 0;
			actor.damaged = 0;
			actor.dirChangeTime = 0;
			actor.dirIndex = 0;
			actor.isRunning = false;

			return actor;
		},

		animateActorSprite: function(actor){
			if(cm.paused){ // || !actor.level.player.physicsBody){
				return;
			}

			var speedEdge = 4;
			var speed = cm.physics.physScalarToView(actor.physicsBody.GetLinearVelocity().Length());
			var isRunning = speed >= 2*speedEdge && !actor.physicsBody.IsSleeping();

			if(actor.dirChangeTime === undefined){
				actor.dirChangeTime = 0;
			}

			var dirIndex = cm.DIR_STAY;
			var level = actor.level;
			if(actor == level.player && actor.isShooting()){
				dirIndex = cm.dirToIndex( level.aimData().targetDir );
				actor.dirChangeTime = 0;
			}else if(!isRunning){
				// dirIndex = cm.DIR_DOWN;
			}else{
				// dirIndex = cm.dirToIndex(p);
			}
			if(dirIndex == cm.DIR_STAY){
				if(!actor.path && actor.time - actor.aimTime < 600 && level.player){ // actor.desc.physics.aimMoveOnly){ // && speed < actor.desc.physics.maxSpeed * 0.7){
					// cm.log("[aimMoveOnly] speed: "+speed+", max: "+actor.desc.physics.maxSpeed);
					var playerPos = level.player.physicsBody ? level.player.physicsBody.GetCenterPosition() : cm.physics.viewToPhysVec(cm.getActorCenter(level.player));
					var monsterPos = actor.physicsBody.GetCenterPosition();
					var dir = playerPos.Copy();
					dir.Subtract(monsterPos);
					dir.Normalize();
					if(actor.aimInverse){
						dir = dir.Negative();
					}
					dirIndex = cm.dirToIndex( cm.physics.physVecToView( dir ) );
					actor.dirChangeTime = 0;
				}else{
					var dir = cm.physics.physVecToView(actor.physicsBody.GetLinearVelocity()); // .normalize();
					if(speed > 0){
						dir.multiply( 1.0 / speed );
					}
					dirIndex = cm.dirToIndex( dir );
					// cm.log("[dir] "+cm.round(dir.x, 3)+" "+cm.round(dir.y, 3)+", new: "+dirIndex+", speed: "+speed);
					if(dirIndex == cm.DIR_UP){
						if(speed <= 3*speedEdge){
							dirIndex = cm.DIR_LEFT_DOWN;
						}else if(speed <= 5*speedEdge){
							dirIndex = cm.DIR_LEFT;
						}else if(speed <= 10*speedEdge){
							dirIndex = cm.DIR_LEFT_UP;
						}
					}else if(dirIndex == cm.DIR_LEFT_UP){
						if(speed <= 5*speedEdge){
							dirIndex = cm.DIR_LEFT_DOWN;
						}
					}else if(dirIndex == cm.DIR_RIGHT_UP){
						if(speed <= 5*speedEdge){
							dirIndex = cm.DIR_RIGHT_DOWN;
						}
					}
				}
			}
			/* if(actor.dirIndex === undefined){
				actor.dirIndex = cm.DIR_DOWN;
				actor.isRunning = null;
			} */
			if(dirIndex == cm.DIR_STAY || actor.time - actor.dirChangeTime < 200){
				dirIndex = actor.dirIndex;
			}
			if(actor.dirIndex != dirIndex || actor.isRunning != isRunning){
				/* if(actor == level.player && actor.dirIndex != dirIndex){
					// cm.log("new dir: "+dirIndex);
				} */
				var diff = dirIndex - actor.dirIndex;
				if(cm.abs(diff) > 1){
					var savePreIndex = dirIndex;
					if(diff > 0){
						var diff2 = diff - 8;
					}else{
						var diff2 = diff + 8;
					}
					if(cm.abs(diff) <= cm.abs(diff2)){
						dirIndex = actor.dirIndex + (diff < 0 ? -1 : 1);
					}else{
						dirIndex = actor.dirIndex + (diff2 < 0 ? -1 : 1);
					}
					dirIndex = (dirIndex + 8) % 8;
				}

				actor.dirChangeTime = actor.time;
				actor.dirIndex = dirIndex;
				actor.isRunning = isRunning;

				actor.sprite.setSpriteTransformation( CAAT.SpriteActor.prototype.TR_NONE );
				if(isRunning || actor.desc.image.dirType == "wc"){
					if(actor.desc.image.dirType == "wc"){
						if(dirIndex > cm.DIR_DOWN){
							actor.sprite.setSpriteTransformation( CAAT.SpriteActor.prototype.TR_FLIP_HORIZONTAL );
						}
						var anims = [];
						// var dirIndex = map[dirIndex];
						for(var i = 0; i < 1; i++){
							anims.push( i*5 + dirIndex );
						}
						actor.sprite.setAnimationImageIndex( anims );
					}else if(actor.sprite.compoundbitmap.cols == 3
							&& actor.sprite.compoundbitmap.rows == 4){
						var anims = [];
						if(dirIndex == cm.DIR_UP){
							anims = [0, 5, 10];
						}else if(dirIndex == cm.DIR_RIGHT_UP || dirIndex == cm.DIR_RIGHT || dirIndex == cm.DIR_RIGHT_DOWN){
							anims = [6, 7, 8];
						}else if(dirIndex == cm.DIR_DOWN){
							anims = [0, 1, 2];
						}else if(dirIndex == cm.DIR_LEFT_UP || dirIndex == cm.DIR_LEFT || dirIndex == cm.DIR_LEFT_DOWN){
							anims = [3, 4, 5];
						}
						actor.sprite.setAnimationImageIndex( anims );
					}else{
						/*
						if(dirIndex == cm.DIR_RIGHT){
							dirIndex = cm.DIR_RIGHT_DOWN;
						}else if(dirIndex == cm.DIR_LEFT){
							dirIndex = cm.DIR_LEFT_DOWN;
						}
						*/
						// var spriteIndex = actor.sprite.spriteIndex;
						actor.sprite.setAnimationImageIndex( [dirIndex*2+0, dirIndex*2+1] );
						// actor.sprite.setSpriteIndex( spriteIndex );
					}
				}else{
					// var spriteIndex = actor.sprite.spriteIndex;
					actor.sprite.setAnimationImageIndex( [dirIndex*2, dirIndex*2] ); // + (spriteIndex&1)] );
				}
			}
		},

		applyActorForce: function(actor, force, params){
			if(force.x || force.y){
				params = params || {};
				force = cm.physics.viewToPhysVec( force );
				if(!params.noClipForce){
                    var scalarSpeed = cm.physics.viewToPhysScalar( actor.desc.physics.maxSpeed );
                    if(params.speedScale !== undefined){
                        scalarSpeed *= params.speedScale;
                    }
                    if(actor.pathMoveMonster !== undefined && !actor.isMonsterVisible){
                        scalarSpeed = Math.max(scalarSpeed, cm.physics.viewToPhysScalar(cm.hiddenMonsterSpeed));
                    }
                    var destSpeed = force.Norm( scalarSpeed );
					var speed = actor.physicsBody.GetLinearVelocity().Copy();
					var clip_edge = 0.5;
					for(var i = 0; i < 2; i++){
						if(i == 0){
							src = speed.x;
							dest = destSpeed.x;
						}else{
							src = speed.y;
							dest = destSpeed.y;
						}
						t = src / (dest ? dest : 0.00001);
						if( t >= clip_edge ){
							t = 1 - (t - clip_edge) / (1 - clip_edge);
							t = cm.clamp(t, -1, 1);
							// if(params.isPlayer) cm.log("[S] "+i+" "+cm.round(t, 4)+" "+cm.round(src, 1)+" "+cm.round(dest, 1));
							if(i == 0){
								force.x *= t;
							}else{
								force.y *= t;
							}
						}
					}
				}
				if(force.x || force.y){
					actor.physicsBody.WakeUp();
					actor.physicsBody.ApplyForce( force, actor.physicsBody.GetCenterPosition() );
				}
			}
		}
	};

	(function(){
		cm.TargetPointer = function(){
			cm.TargetPointer.superclass.constructor.call(this);
			return this;
		};

		cm.TargetPointer.prototype = {
			level: null,

			create: function(level){
				cm.TargetPointer.superclass.create.call(this);

				this.level = level;

				/*
				this.setShape( CAAT.ShapeActor.prototype.SHAPE_CIRCLE );
				this.setFillStyle("#ff0000");
				this.setAlpha(0.2);
				this.setSize(50, 50);
				*/

				cm.setupActor(this, cm.clone({
					image: {
						id: 'aim'
					}
				}));

				return this;
			}
		};

		extend(cm.TargetPointer, CAAT.ShapeActor, null);
	})();

	(function(){
		cm.MouseCapture = function(){
			cm.MouseCapture.superclass.constructor.call(this);
			return this;
		};

		cm.MouseCapture.prototype = {
			level: null,

			create: function(level){
				cm.MouseCapture.superclass.create.call(this);
				this.level = level;
				return this;
			},

			mouseEnter: function(mouseEvent) {
				document.body.style.cursor = 'crosshair';
			},

			mouseExit: function(mouseEvent) {
				document.body.style.cursor = 'default';
			},

			mouseDown: function(mouseEvent){
                window.focus();
				if(!cm.paused && this.level.player && this.level.player.isPlayer){
					this.level.player.startFire();
				}
			},

			mouseUp: function(mouseEvent){
				if(!cm.paused && this.level.player && this.level.player.isPlayer){
					this.level.player.endFire();
				}
			},

			mouseMove: function(mouseEvent){
				var actor = mouseEvent.source;
				/*
				cm.log( "[M]"
						+ " P: " + cm.round(mouseEvent.point.x) + " " + cm.round(mouseEvent.point.y)
						+ " S: " + cm.round(mouseEvent.screenPoint.x) + " " + cm.round(mouseEvent.screenPoint.y)
						+ ", A: " + cm.round(actor.x) + " " + cm.round(actor.y)
						);
				*/
				var t = this.level.targetPointer;
				t.x = mouseEvent.point.x + actor.x - t.width/2;
				t.y = mouseEvent.point.y + actor.y - t.height/2;

				/* if(mouseEvent.isControlDown()){
					this.level.player.moveToCursor();
				} */
			},

			mouseDrag: function(mouseEvent){
				this.mouseMove(mouseEvent);
			}
		};

		extend(cm.MouseCapture, CAAT.ActorContainer, null);
	})();

	(function(){
		cm.Bullet = function(){
			cm.Bullet.superclass.constructor.call(this);
			return this;
		};

		cm.Bullet.prototype = {
			level: null,
			owner: null,

			create: function(owner, params){
				cm.Bullet.superclass.create.call(this);

				this.owner = owner;
				this.level = owner.level;

				// cm.log('[Bullet.create]', params);

				if(params.through && params.damageCount > 1){
					params = cm.extend(params, {
						physics: {
							shapes: [
								{
									radiusScale: 1.0,
									ignoreBits: cm.physics.CAT_BIT_PLAYER_FIRE | cm.physics.CAT_BIT_PLAYER
										| cm.physics.CAT_BIT_HOLE | cm.physics.CAT_BIT_MONSTER_AREA | cm.physics.CAT_BIT_MONSTER
										| cm.physics.CAT_BIT_POWERUP | cm.physics.CAT_BIT_BLOOD
								},
								{
									radiusScale: 1.1,
									sensor: true,
									ignoreBits: cm.physics.CAT_BIT_ALL & ~(cm.physics.CAT_BIT_MONSTER | cm.physics.CAT_BIT_MONSTER_FIRE)
								}
							]
						}
					});
				}

				cm.setupActor(this, cm.extend({
					image: {
						id: 'weapon-1',
						size: [ 2, 1 ],
						ms: 150,
						animation: [0, 1]
					},
					spawnOffs: 30,
					damage: 10, // + 50,
					physics: {
						speed: 250, // 300,
						rotationEnabled: true,
						width: 30,
						height: 20,
						// radius: 20,
						density: 0.1,
						linearDamping: 0,
						restitution: 1.0,
						categoryBits: cm.physics.CAT_BIT_PLAYER_FIRE,
						ignoreBits: cm.physics.CAT_BIT_PLAYER_FIRE | cm.physics.CAT_BIT_PLAYER
							| cm.physics.CAT_BIT_HOLE | cm.physics.CAT_BIT_MONSTER_AREA
							| cm.physics.CAT_BIT_POWERUP | cm.physics.CAT_BIT_BLOOD
					},
					life: {
						// start: owner.time,
						behaviors: [
							{
								alpha: true,
								start: 1500,
								duration: 500
							}
						]
					}
				}, params));
				return this;
			},

			damagedList: [],
			onPhysicsContact: function(contact, i){
				var logStr = "";
				var otherName = "unknown";
				var other = i ? contact.m_shape1 : contact.m_shape2;
				if(other.m_categoryBits & cm.physics.CAT_BIT_PLAYER){
					if(this.desc.physics.categoryBits & cm.physics.CAT_BIT_MONSTER_FIRE){
						// console.log('monster fire is touched', this.desc);
						other.m_body.actor.onEnemyTouched(this);
					}
				}else if(other.m_categoryBits & cm.physics.CAT_BIT_MONSTER){
					otherName = "enemy";

					targetActor = other.m_body.actor;
					if(targetActor.isMonsterVisible === undefined || targetActor.isMonsterVisible){
						var curShape = !i ? contact.m_shape1 : contact.m_shape2, alreadyDamaged = false;
						for(var i = this.damagedList.length-1; i >= 0; i--){
							var item = this.damagedList[i];
							if(this.time - item.time > 300){
								this.damagedList.splice(i, 1);
								continue;
							}
							if(item.actor == targetActor){
								alreadyDamaged = true;
								// console.log('alreadyDamaged', targetActor);
								break;
							}
						}
						if(!alreadyDamaged){
							if(this.desc.damageCount > 1){
								this.desc.damageCount--;
								this.damagedList.push({time: this.time, actor: targetActor});
							}else{
								cm.deleteActor( this );
							}
							if(!targetActor.expired && targetActor.desc.health > 0){
								this.level.createBlood(targetActor, 3);

								targetActor.damagedTime = targetActor.time;
								targetActor.damaged += this.desc.damage;
								var damaged = targetActor.damaged + targetActor.desc.health * (1 - cm.playerData.effects.scale.monsterHealth);
								// logStr += targetActor.damaged+" "+cm.round(cm.min(255, damaged * 255 / targetActor.desc.health));
								// targetActor.setFillStyle("rgb("+p+",0,0)");

								if(damaged >= targetActor.desc.health){
									this.level.onEnemyKilled(targetActor);
									targetActor.playDeathSound();
									cm.dieActor(targetActor);
								}else{
									targetActor.playPainSound();
								}
							}
						}
					}else{
						logStr += "invisible"
					}
				}else if((other.m_categoryBits & cm.physics.CAT_BIT_PLAYER_FIRE)
							&& (this.desc.physics.categoryBits & cm.physics.CAT_BIT_MONSTER_FIRE))
				{
					// cm.deleteActor(this);
					// cm.deleteActor(other.m_body.actor);
				}else if(other.m_categoryBits & cm.physics.CAT_BIT_STATIC){
					// cm.sound.play({actor:"bullet", channel:"ric", sound:["temp/ric1", "temp/ric3"], lock_ms:10000, priority:0});
				}else{
					otherName = other.m_categoryBits;
				}
				// cm.log("[bullet contact] ", otherName, logStr);
			}
		};

		extend(cm.Bullet, CAAT.ActorContainer, null);
	})();

	(function(){
		cm.Blood = function(){
			cm.Blood.superclass.constructor.call(this);
			return this;
		};

		cm.Blood.prototype = {
			level: null,

			create: function(level, params){
				cm.Blood.superclass.create.call(this);

				this.level = level;

				cm.setupActor(this, cm.extend({
					// center: pos,
					image: {
						id: "blood-monster",
						size: [4, 4]
						// animation: [ cm.randItem(activeFrames) ]
					},
					// shape: false,
					angle: 2*Math.PI * cm.rand(),
					targetDir: /*new*/ cm.Point( cm.randSign(), cm.randSign() ).normalize(),
					spawnOffs: cm.randRange(5, 20),
					physics: {
						radiusScale: 2.0,
						speed: 5 + cm.randSign()*5,
						density: 1.0,
						linearDamping: 0.05 + cm.randSign()*0.025,
						categoryBits: cm.physics.CAT_BIT_BLOOD,
						ignoreBits: cm.physics.CAT_BIT_ALL & ~(cm.physics.CAT_BIT_STATIC | cm.physics.CAT_BIT_HOLE)
					},
					life: {
						behaviors: [
							{
								start: cm.randRange(5000, 15000),
								duration: cm.randRange(5000, 10000),
								alpha: [ 1, 0 ]
							}
						]
					}
				}, params));

				return this;
			},

			startTime: null,
			animate: function(director, time){
				if(this.physicsBody !== undefined){
					// cm.log('blood time', time, this.time, this.start_time);
					if(!this.startTime){
						this.startTime = this.time;
					}
					if(this.time - this.startTime > 3000 || this.physicsBody.IsSleeping()){
						var physicsWorld = this.level.physics.world;
						physicsWorld.DestroyBody( this.physicsBody );
						this.physicsBody = undefined;
					}else{
						// this.physicsBody.WakeUp();
					}
				}
				return cm.Blood.superclass.animate.call(this, director, time);
			}
		};

		extend(cm.Blood, CAAT.ActorContainer, null);
	})();

	(function(){
		cm.Medal = function(){
			cm.Medal.superclass.constructor.call(this);
			return this;
		};

		cm.Medal.prototype = {
			level: null,

			create: function(level, params){
				cm.Medal.superclass.create.call(this);

				this.level = level;

                var medalParams = cm.getMedalByNum(params.medalNum);
                // console.log('medal num', medalNum, medalParams, this.enemyKilledFastCount, this.enemyKilledHealth);
                cm.setupActor(this, cm.extend({
                    medalNum: medalParams.medalNum,
                    itemId: medalParams.itemId,
                    // center: cm.getActorCenter(enemy),
                    imageBackground: {
                        id: 'medal_shine'
                    },
                    image: {
                        id: 'medal',
                        imageId: medalParams.image.id
                    },
                    // shape: false,
                    angle: 0,
                    targetDir: /*new*/ cm.Point( cm.randSign(), cm.randSign() ).normalize(),
                    spawnOffs: 10,
                    physics: {
                        radiusScale: 1,
                        density: 0.5,
                        speed: 100 + cm.randSign()*25,
                        linearDamping: 0.02,
                        categoryBits: cm.physics.CAT_BIT_POWERUP
                    },
                    life: {
                        behaviors: [
                            {
                                start: 0,
                                duration: 1000,
                                alpha: [0, 1]
                            },
                            {
                                start: 10000,
                                duration: 1000,
                                behaviors: [ {
                                    duration: 200,
                                    pingpong: true,
                                    cycle: true,
                                    alpha: [0, 1]
                                } ]
                            },
                            {
                                start: 20000,
                                duration: 1000,
                                behaviors: [ {
                                    duration: 200,
                                    pingpong: true,
                                    cycle: true,
                                    alpha: [0, 1]
                                } ]
                            },
                            {
                                start: 30000,
                                duration: 1000,
                                behaviors: [ {
                                    duration: 200,
                                    pingpong: true,
                                    cycle: true,
                                    alpha: [0, 1]
                                } ]
                            },
                            {
                                start: 45000,
                                duration: 10000,
                                behaviors: [ {
                                    duration: 200,
                                    pingpong: true,
                                    cycle: true,
                                    alpha: [0, 1]
                                } ]
                            },
                            {
                                start: 55000,
                                duration: 5000,
                                alpha: [ 1, 0 ]
                            }
                        ]
                    }
				}, params));

				return this;
			},

			animate: function(director, time){
                // this.imageBackground.setRotation( Math.PI*2.0 * time*0.001 /3  );
                var secs = time * 0.001;
                var angle = Math.cos( Math.PI*2.0 * secs/7 ) * Math.PI*3.0;
                this.imageBackground.setRotation( angle  );
				return cm.Medal.superclass.animate.call(this, director, time);
			}
		};

		extend(cm.Medal, CAAT.ActorContainer, null);
	})();

	(function(){
		cm.Item = function(){
			cm.Item.superclass.constructor.call(this);
			return this;
		};

		cm.Item.prototype = {
			level: null,

			create: function(level, params){
				cm.Item.superclass.create.call(this);

				this.level = level;

                var item = cm.playerData.itemsById[params.itemId], ext_params = null;
                if(item.typeId == cm.consts.ITEM_TYPE_WEAPON){
                    ext_params = {
                        image: {
                            size: [ 2, 1 ],
                            ms: 150,
                            animation: [0, 1]
                        }
                    };
                }

                cm.setupActor(this, cm.extend({
                    itemId: params.itemId,
                    center: params.center,
                    imageBackground: {
                        id: 'medal_shine'
                    },
                    image: {
                        id: 'item',
                        imageId: params.image.id
                    },
                    // shape: false,
                    angle: 0,
                    targetDir: /*new*/ cm.Point( cm.randSign(), cm.randSign() ).normalize(),
                    spawnOffs: 10,
                    physics: {
                        radiusScale: 1,
                        density: 0.5,
                        speed: 100 + cm.randSign()*25,
                        linearDamping: 0.02,
                        categoryBits: cm.physics.CAT_BIT_POWERUP
                    },
                    life: {
                        behaviors: [
                            {
                                start: 0,
                                duration: 1000,
                                alpha: [0, 1]
                            },
                            {
                                start: 25000,
                                duration: 1000,
                                behaviors: [ {
                                    duration: 200,
                                    pingpong: true,
                                    cycle: true,
                                    alpha: [0, 1]
                                } ]
                            },
                            {
                                start: 45000,
                                duration: 10000,
                                behaviors: [ {
                                    duration: 200,
                                    pingpong: true,
                                    cycle: true,
                                    alpha: [0, 1]
                                } ]
                            },
                            {
                                start: 55000,
                                duration: 5000,
                                alpha: [ 1, 0 ]
                            }
                        ]
                    }
				}, ext_params));

                // [begin debug]
                if(cm.logEnabled) cm.log('item spawned', params.image.id, this.desc, params);
                // [end debug]

				return this;
			},

			animate: function(director, time){
                var secs = time * 0.001;
                var angle = Math.cos( Math.PI*2.0 * secs/7 ) * Math.PI*3.0;
                this.imageBackground.setRotation( angle  );
				return cm.Item.superclass.animate.call(this, director, time);
			}
		};

		extend(cm.Item, CAAT.ActorContainer, null);
	})();

	(function(){
		cm.PlayerDie = function(){
			cm.PlayerDie.superclass.constructor.call(this);
			return this;
		};

		cm.PlayerDie.prototype = {
			owner: null,
			level: null,

			create: function(player){
				cm.PlayerDie.superclass.create.call(this);

				this.owner = player;
				this.level = player.level;

				var s = player.sprite;
				this.setSpriteImage( s.compoundbitmap )
					.setAnimationImageIndex( [17,18,19] )
					.setChangeFPS( 500 )
					.setBounds( player.x, player.y, player.width, player.height )
					// .setFrameTime( player.time, 5000 )
					// .setDiscardable( true )
					;

				/* this.addListener({
						actorLyfeCycleEvent: function( actor, eventType, time ){
							// cm.log("[actor life event] "+eventType);
							if(eventType == "destroyed"){
								if(actor.onDestroy){
									actor.onDestroy();
								}
							}
						}
					}); */

				return this;
			},

			animate: function(director, time){
				var prevSpriteIndex = this.spriteIndex;

				cm.PlayerDie.superclass.animate.call(this, director, time);

				if(this.spriteIndex < prevSpriteIndex){
					this.spriteIndex = prevSpriteIndex;
				}

				return true;
			}
		};

		extend(cm.PlayerDie, CAAT.SpriteActor, null);
	})();

	(function(){
		cm.Player = function(){
			cm.Player.superclass.constructor.call(this);
			return this;
		};

		cm.Player.prototype = {
			level: null,
            isPlayer: true,

			physicsBody: null,
			sprite: null,
            protectionEndTimeSec: null,

			originSpeed: 120,

			create: function(level, params){
				cm.Player.superclass.create.call(this);

				this.level = level;
                this.protectionEndTimeSec = cm.playerData.playTimeSec + 20;

				// cm.log('[Player.create] setupActor');
				cm.setupActor(this, cm.extend({
					center: {x: cm.director.width * cm.randRange(0.2, 0.8), y: cm.director.height * cm.randRange(0.2, 0.8)},
					image: {
						id: "player",
						imageId: cm.playerData.armorItem.nameId,
						size: [ 20, 1 ],
						ms: 200
					},
					sounds: {
						// pain: [ "player-pain-1", "player-pain-2", "player-pain-3", "player-pain-4", "player-pain-5", "player-pain-6", "player-pain-7", "player-pain-8" ],
						pain: [ "player2-pain-1", "player2-pain-2", "player2-pain-3", "player2-pain-4", "player2-pain-5", "player2-pain-6", "player2-pain-7", "player2-pain-8" ],
						death: [ "player-death-1", "player-death-2" ]
					},
					// health: 100,
					physics: {
						// radiusScale: 1,
						// density: 1.0,
						restitution: 0.2,
						// friction: 1.0,
						linearDamping: 0.08,
						stopLinearDamping: 0.03,
						// angularDamping: 1.0,
						categoryBits: cm.physics.CAT_BIT_PLAYER,
						ignoreBits: cm.physics.CAT_BIT_PLAYER_FIRE | cm.physics.CAT_BIT_BLOOD | cm.physics.CAT_BIT_MONSTER_AREA,

						minSpeed: 0,
						maxSpeed: this.originSpeed,
						forcePower: 10000 * 3.0,
						shapes: [ {
							radiusScale: 0.8
							// widthScale: 0.6,
							// heightScale: 0.9
						}, {
							radiusScale: 2.5,
							sensor: true,
							density: 0,
							ignoreBits: cm.physics.CAT_BIT_ALL & ~cm.physics.CAT_BIT_POWERUP
						} /*, {
							radiusScale: 8,
							sensor: true,
							density: 0,
							ignoreBits: cm.physics.CAT_BIT_ALL & ~cm.physics.CAT_BIT_MONSTER
						}*/ ]
					}
				}, params));

				// this.nextWeapon();

				cm.each([
                    "player2-pain-1", "player2-pain-2", "player2-pain-3", "player2-pain-4", "player2-pain-5", "player2-pain-6", "player2-pain-7", "player2-pain-8",
                    "player-death-1", "player-death-2",

					"coin-1", "coin-2", "coin-3",
					"item-1", "item-2", "item-3",
					"medal-1", "medal-2",
					"headshot", "airshot", "amazing", "awesome", "impressive",
					"05kills", "10kills", "15kills", "20kills", "25kills", "30kills",
					"footstep01", "footstep02", "footstep03", "footstep04", "footstep05", "footstep06",
					// "foot1", "foot2", "foot3", "foot4", "foot5", "foot6", "foot7"

                    "temp/AMB_BD_1", "temp/AMB_SN_5", "temp/AMB_FTM2", "temp/cg1"

					], function(i, id){
					if(cm.sound.register(id)){
						// cm.log('[player sound] load '+id);
					}
				});

				this.setMaxSpeed(130);

				return this;
			},

			setMaxSpeed: function(value){
				var keys = {
					120: {
						linearDamping: 0.04,
						forcePower: 10000 * 2.0
					},
					300: {
						linearDamping: 0.08,
						forcePower: 10000 * 3.0
					}
				};
				var selectedKeys = [];
				for(var speed in keys){
					if(speed <= value && (selectedKeys[0] === undefined || selectedKeys[0].speed < speed)){
						selectedKeys[0] = {
							speed: speed,
							linearDamping: keys[speed].linearDamping,
							forcePower: keys[speed].forcePower
						};
					}
					if(speed >= value && (selectedKeys[1] === undefined || selectedKeys[1].speed > speed)){
						selectedKeys[1] = {
							speed: speed,
							linearDamping: keys[speed].linearDamping,
							forcePower: keys[speed].forcePower
						};
					}
				}
				var result = {};
				if(selectedKeys[0] !== undefined && selectedKeys[1] !== undefined){
					var a = selectedKeys[0], b = selectedKeys[1];
					if(a.speed == b.speed){
						result = a;
					}else{
						var t = (value - a.speed) * 1.0 / (b.speed - a.speed);
						for(var i in a){
							result[i] = a[i] + (b[i] - a[i]) * t;
						}
					}
				}else if(selectedKeys[0] !== undefined){
					result = selectedKeys[0];
				}else{
					result = selectedKeys[1];
				}
				result.speed = value;
				// cm.log('set player max speed', value, selectedKeys, result, t);

				this.desc.physics.linearDamping = result.linearDamping;
				this.desc.physics.maxSpeed = result.speed;
				this.desc.physics.forcePower = result.forcePower;

				this.physicsBody.m_linearDamping = 1 - this.desc.physics.linearDamping;
				this.stopDampingUpdated = false;
			},

			playPainSound: function(){
				// cm.log("playPainSound", this.desc.sounds.pain);
				cm.sound.play({actor:this.desc.image.id, channel:'pain', volume:100, sound:this.desc.sounds.pain});

				this.level.hud.onPain(); // playerFace.sprite.setAnimationImageIndex( [2] );
			},

			playDeathSound: function(){
				cm.sound.play({actor:this.desc.image.id, channel:'death', volume:100, sound:this.desc.sounds.death});
			},


			enemyKilledTime: 0,
			enemyKilledFastCount: 0,
			enemyKilledHealth: 0,
			enemyKilledSoundTimer: null,
			onEnemyKilled: function(enemy){
				if(this.time - this.enemyKilledTime <= 2000){
					this.enemyKilledFastCount++;
                    this.enemyKilledHealth += enemy.desc.health;
				}else{
                    if(this.enemyKilledFastCount >= 2 || this.enemyKilledHealth >= 500){
                        // var medalNum = cm.clamp(cm.round(this.enemyKilledFastCount/3), 1, 10);
                        var medalNum = cm.clamp(cm.round(
                                Math.pow(this.enemyKilledFastCount, 0.5)
                                + cm.max(0, this.level.params.level-1) / 2
                                + cm.max(0, this.level.params.invasion-1) / 5
                                + cm.max(0, this.level.params.day-1) / 20
                                + cm.playerData.daysCompleted / 10
                                + this.enemyKilledHealth / 500
                            ), 1, cm.playerData.maxMedalNum);
                        if(this.level.params.level < 1){
                            medalNum = cm.min(cm.playerData.maxMedalNum, medalNum*2 + 5);
                        }
                        // [begin debug]
                        if(cm.logEnabled) cm.log('medal num', medalNum, this.enemyKilledFastCount, this.enemyKilledHealth, 'max', cm.playerData.maxMedalNum);
                        // [end debug]

                        var medal = /*new*/ cm.Medal().create(this.level, {
                            medalNum: medalNum,
                            center: cm.getActorCenter(enemy)
                        });
                        this.level.layers[this.level.LAYER.MEDALS].addChild( medal );
                    }
					this.enemyKilledFastCount = 1;
                    this.enemyKilledHealth = enemy.desc.health;
				}
				this.enemyKilledTime = this.time;

				clearTimeout(this.enemyKilledSoundTimer);
				if(this.enemyKilledFastCount >= 2){
					enemy.bonusScale = cm.clamp(this.enemyKilledFastCount/5, 1, 3);
					var sound = [];
					if(this.enemyKilledFastCount <= 3){
						sound.push("amazing");
						sound.push("awesome");
						sound.push("impressive");
					}
					switch(this.enemyKilledFastCount){
					case 3:
						sound.push("05kills");
						break;
					case 4:
						sound.push("10kills");
						break;
					case 5:
						sound.push("15kills");
						break;
					case 6:
						sound.push("20kills");
						break;
					case 7:
						sound.push("25kills");
						break;
					case 8:
						sound.push("30kills");
						break;
					default:
						sound.push("30kills");
						sound.push("25kills");
						sound.push("20kills");
						break;
					}
					this.enemyKilledSoundTimer = setTimeout(function(){
						cm.sound.play({actor:"player", channel: "talk", volume:100,
							sound: sound,
							lock_ms: 1000});
					}, 500);
				}else if(cm.rand() <= 0.1){
					this.enemyKilledSoundTimer = setTimeout(function(){
						cm.sound.play({actor:"player", channel: "talk", volume:100,
							sound: ["headshot", "airshot"],
							lock_ms: cm.randRange(1000, 10000)});
					}, cm.randRange(500, 1000));
				}
			},

			onPhysicsContact: function(contact, i){
				if(this.level.player != this){
					return;
				}
				var other = i ? contact.m_shape1 : contact.m_shape2;
				if(other.m_categoryBits & cm.physics.CAT_BIT_MONSTER){
					enemy = other.m_body.actor;
					this.onEnemyTouched( enemy );
				}else if(other.m_categoryBits & cm.physics.CAT_BIT_POWERUP){
					powerup = other.m_body.actor;
					name = powerup.desc.image.id;
                    // console.log('onPhysicsContact CAT_BIT_POWERUP', powerup.desc);
					switch(name){
					case "money":
						this.onMoneyTouched( powerup );
						break;

					case "meat":
						this.onMeatTouched( powerup );
						break;

                    case "medal":
						this.onMedalTouched( powerup );
						break;

                    case "item":
						this.onItemTouched( powerup );
						break;
					}
				}
			},

            controlTime: 0,
            damageCount: 0,

			onEnemyTouched: function(enemy){
                if(cm.playerData.playTimeSec < this.protectionEndTimeSec){
                    return;
                }
				// if(this.time - cm.playerData.damagedTime > 300){
					this.level.createBlood(this, 4, undefined, {
						image: {
							id: "blood-player"
						}
					});
					this.playPainSound();
				// }
				if(this.time - cm.playerData.damagedTime > 1000){
					/* if(cm.playerData.meatSumCollected > 0 && enemy.desc.health > 0){
						var meatCount = cm.randRange(1, cm.ceil(enemy.desc.health / 100));
						cm.playerData.meatSumCollected = cm.round(cm.max(0, cm.playerData.meatSumCollected - meatCount));
					} */

					var damage = cm.min(cm.playerData.health / 10, cm.max(cm.param(enemy.desc.damage, 0), cm.param(enemy.desc.health, 0) / 5));

					var playerHealth = cm.playerData.health * cm.playerData.effects.scale.playerHealth;
					var playerArmor = cm.playerData.armor * cm.playerData.effects.scale.playerArmor;

					var armorDamage = cm.clamp(playerArmor - cm.playerData.armorDamaged, 0, damage);
					cm.playerData.armorDamaged += armorDamage;
					cm.playerData.healthDamaged += damage - armorDamage;

					cm.playerData.damagedTime = this.time;

					// cm.log('onEnemyTouched', damage, armorDamage, cm.playerData.armorDamaged, cm.playerData.healthDamaged, cm.playerData);

                    if(cm.level.params.level < 1){
                        if(cm.playerData.healthDamaged >= playerHealth*0.95){
                            cm.playerData.healthDamaged = playerHealth*0.95;
                        }
                    }

					if(cm.playerData.healthDamaged >= playerHealth){
						this.playDeathSound();

						// cm.dieActor(this, 500);
						var layer = this.level.layers[this.level.LAYER.PLAYER_DIE];
                        this.level.player = /*new*/ cm.PlayerDie().create(this);
						layer.addChild(this.level.player);
						cm.deleteActor(this);
					}else if(++this.damageCount >= 3 && this.time - this.controlTime >= 5000){
                        var self = this;
                        var damageCount = this.damageCount;
                        var noControlTimeSec = (this.time - this.controlTime) * 0.001;
                        var damagePercentage = playerHealth > 0 ? cm.playerData.healthDamaged / playerHealth : 1;
                        // this.damageCount = 0;
                        // this.controlTime = 0;
                        // setTimeout(function(){
                            if(cm.callbacks['playerDamagedWithNoControl'](damageCount, noControlTimeSec, damagePercentage)){
                                self.controlTime = self.time;
                                self.damageCount = 0;
                            }
                        // }, 0);
                    }
				}
			},

			onDestroy: function(){
				var self = this;

				function playerDead(){
                    if(self.level.player == self){
                        self.level.player = null;
                        // [begin debug]
                        if(cm.logEnabled) cm.log('player is dead, reset player');
                        // [end debug]
                    }else{
                        // [begin debug]
                        if(cm.logEnabled) cm.log('player is dead', self.level.player, self);
                        // [end debug]
                    }

                    cm.ajaxPlayerDead();
				};

				if(0 && self.dieActor){
					var prevAnimate = self.dieActor.animate;
					self.dieActor.setFrameTime(self.dieActor.time, self.dieActor.changeFPS * 7);
					self.dieActor.animate = function(director, time){
						var prevSpriteIndex = this.spriteIndex;
						prevAnimate.apply(this, arguments);
						if(this.spriteIndex < prevSpriteIndex){
							this.spriteIndex = prevSpriteIndex;
						}
					};
					self.dieActor.onDestroy = function(){
						return;
						/*
						var deadActor = cm.createActor(self.level, CAAT.ActorContainer, cm.clone({
							center: cm.getActorCenter(self),
							image: {
								id: self.desc.image.id,
								size: self.desc.image.size,
								animation: [19]
							},
							angle: 0,
							life: {
								behaviors: [
									{
										alpha: true,
										start: 3000,
										duration: 1000
									}
								]
							}
						}));
						self.parent.addChild( deadActor );
						*/
						var s = self.sprite, changeFPS = 500;
						var deadActor = /*new*/ CAAT.SpriteActor().create()
							.setSpriteImage( s.compoundbitmap )
							.setAnimationImageIndex( [19] )
							// .setChangeFPS( changeFPS )
							.setBounds( self.x, self.y, self.width, self.height )
							.setFrameTime( self.time, 3000 )
							.setDiscardable( true )
							;
						deadActor.addListener({
								actorLyfeCycleEvent: function( actor, eventType, time ){
									// cm.log("[actor life event] "+eventType);
									if(eventType == "destroyed"){
										if(actor.onDestroy){
											actor.onDestroy();
										}
									}
								}
							});
						// deadActor.level = self.level;
						// deadActor.desc = self.desc;
						// self.deadActor = deadActor;
						self.parent.addChild(deadActor);


						playerDead();
					};
				}else{
					playerDead();
				}
			},

			animTouchedPowerup: function(imageId, powerup, hudActor){
				var destCenter = cm.getActorCenter(hudActor);
				var center = this.level.view.modelToView( cm.getActorCenter(powerup) );
				// var center = cm.getActorCenter(powerup);
				var delayMS = cm.randRange(0, 500);
				// cm.log('[onMoneyTouched] createActor');
                var ext_params = imageId.image !== undefined ? imageId : {image: {id: imageId}};
				var animActor = cm.createActor(this.level, CAAT.ActorContainer, cm.extend({
					center: center,
					// image: {id: imageId},
					angle: 0,
					life: {
						behaviors: [ {
							duration: 200,
							alpha: [1, 0]
						},
						{
							start: 200,
							duration: 400,
							behaviors: [
								{
									duration: 200,
									pingpong: true,
									cycle: true,
									alpha: [0, 1]
								}
							]
						},
						{
							duration: 1000 + cm.randRange(0, 500),
							interpolator: {
								type: "exp_in_out",
								exp: 3
							},
							path: {
								anchor: CAAT.Actor.prototype.ANCHOR_CENTER,
								quadric: [ null,
										   {x: destCenter.x, y: center.y+100},
										   destCenter ]
							}
						} ]
					}
				}, ext_params));
				this.level.hud.addChild( animActor );

				cm.deleteActor( powerup );
			},

			onMoneyTouched: function(powerup){
				cm.playerData.money++;
                cm.playerData.moneySumCollected++;
				cm.sound.play({actor:"player", channel:"coin", sound:["coin-1", "coin-2", "coin-3"], volume:100, lock_ms:5000});
				this.animTouchedPowerup("money", powerup, this.level.hud.moneyImage);
			},

			onMeatTouched: function(powerup){
				cm.playerData.meat++;
                cm.playerData.meatSumCollected++;
				cm.sound.play({actor:"player", channel:"item", sound:["item-1", "item-2", "item-3"], volume:100, lock_ms:cm.randRange(1000, 5000)});
				this.animTouchedPowerup("meat", powerup, this.level.hud.meatImage);
			},

			onMedalTouched: function(powerup){
				cm.sound.play({actor:"player", channel:"item", sound:["medal-1", "medal-2"], volume:100, lock_ms:cm.randRange(1000, 5000)});
                this.level.onMedalCollected(powerup);
				// cm.sound.play({actor:"player", channel:"coin", sound:["coin-1", "coin-2", "coin-3"], volume:100, lock_ms:5000});
				this.animTouchedPowerup(powerup.desc.image.imageId,
                    powerup,
                    this.level.hud.getMedalImageByNum(powerup.desc.medalNum));
			},

			onItemTouched: function(powerup){
                // [begin debug]
                if(cm.logEnabled) cm.log('onItemTouched', powerup.desc.image.imageId);
                // [end debug]
                this.level.onItemCollected(powerup);
				// cm.sound.play({actor:"player", channel:"coin", sound:["coin-1", "coin-2", "coin-3"], volume:100, lock_ms:5000});

                var item = cm.playerData.itemsById[powerup.desc.itemId], params = null;
                if(item.typeId == cm.consts.ITEM_TYPE_WEAPON){
                    params = {
                        image: {
                            id: powerup.desc.image.imageId,
                            size: [ 2, 1 ],
                            ms: 150,
                            animation: [0, 1]
                        }
                    };
                }else{
                    params = powerup.desc.image.imageId;
                }

				this.animTouchedPowerup(params,
                    powerup,
                    this.level.hud.getItemImage(powerup));
			},

			onHappy: function(){
				cm.sound.play({actor:"player", channel:"item", sound:["item-1", "item-2", "item-3"], volume:100, lock_ms:cm.randRange(1000, 5000), priority:10});
			},

			footstepSoundTime: 0,
			playFootstepSound: function(){
				var lock_ms = 400;
				if(this.time - this.footstepSoundTime >= lock_ms){
					this.footstepSoundTime = this.time;
					cm.sound.play({actor:"player", channel:"footstep", sound:
						["footstep01", "footstep02", "footstep03", "footstep04", "footstep05", "footstep06"],
						volume:30,
						// ["foot1", "foot2", "foot3", "foot4", "foot5", "foot6", "foot7"],
						lock_ms:lock_ms, priority:0});
				}
			},

			spawnBulletStep: 0,
			spawnBullet: function(step){
				var level = this.level;
                if(level.player != this){ // || cm.isActorDead(this)){
                    this.endFire();
                    return;
                }
                var aim = level.aimData(), activeWeapon;
				for(var id in cm.playerData.activeWeapons){
					activeWeapon = cm.playerData.activeWeapons[id];
					break;
				}
				if(!activeWeapon){
					// return;
				}
                // console.log('player spawnBullet', activeWeapon, cm.playerData.activeWeapons);

				// new cm.Point(params.targetDir.x, params.targetDir.y).getAngle();
				// new cm.Point(1, 0).setAngle( params.angle );

				// this.dirIndex = cm.dirToIndex( aim.targetDir );
				// cm.log('pre bullet', activeWeapon.actorParams, cm.playerData.effects.scale, this.desc.physics);

				var damage = activeWeapon.actorParams.damage * cm.playerData.effects.scale.weaponDamage;
				var damageCount = activeWeapon.actorParams.damageCount;
				var through = activeWeapon.actorParams.through;
				var speed = cm.max(activeWeapon.actorParams.physics.speed * cm.playerData.effects.scale.weaponSpeed, this.desc.physics.maxSpeed * 1.1);
				var density = activeWeapon.actorParams.physics.density * cm.playerData.effects.scale.weaponDensity;

				var spawnList = [ {center: aim.playerPos, targetDir: aim.targetDir} ];
				var traceCount = activeWeapon.actorParams.traceCount;
				if(traceCount > 1){
					// var angleOffs = 30 * 2*Math.PI / 360;
					var coverPercentage = activeWeapon.actorParams.coverPercentage;
					var angleOffs = (2*Math.PI / traceCount) * coverPercentage / 100;
					var angle = aim.targetDir.getAngle();
					if(traceCount & 1){
						for(var i = (traceCount/2)|0; i > 0; i--){
							spawnList.push({center: aim.playerPos, targetDir: /*new*/ cm.Point(1, 0).setAngle(angle + angleOffs * i)});
							spawnList.push({center: aim.playerPos, targetDir: /*new*/ cm.Point(1, 0).setAngle(angle - angleOffs * i)});
						}
					}else{
						spawnList = [];
						angle -= (traceCount - 1) / 2.0 * angleOffs;
						for(var i = traceCount-1; i >= 0; i--){
							spawnList.push({center: aim.playerPos, targetDir: /*new*/ cm.Point(1, 0).setAngle(angle + angleOffs * i)});
						}
					}
				}

				for(var i = spawnList.length-1; i >= 0; i--){
					var bullet = /*new*/ cm.Bullet().create(this, cm.extend(activeWeapon.actorParams, { // cm.weapons[this.weapon], {
						center: spawnList[i].center,
						targetDir: spawnList[i].targetDir,
						spawnOffs: 10,
						damage: damage,
						damageCount: damageCount,
						through: through,
						physics: {
							// speed: 350 // 250 + 25 * (this.level.params.day-1 + this.level.wave.phase*0.1)
							speed: speed,
							density: density
						}
					}));
					level.layers[level.LAYER.EFFECTS].addChild(bullet);
				}

				// if( (this.spawnBulletStep = (this.spawnBulletStep + 1) % 2) == 0 ){
				// if(!step)
				{
					cm.sound.play({actor:"player", channel:"fire",
						// sound:["temp/AMB_BD_1"], lock_ms:100}); // cm.randRange(150, 200)});
						sound:["temp/magnet_on"], lock_ms:100}); // cm.randRange(150, 200)});
						// sound:["weapon-fire-1"], lock_ms:100}); // loop:true});
						// sound:["temp/hookbomb_fire"], lock_ms:50, each:2});
						// sound:["temp/hook_fire"], lock_ms:50, each:2});
						// sound:["temp/ric1", "ric2", "ric3"], lock_ms:50});
						// sound:["temp/ric3"], lock_ms:cm.randRange(50, 200)});
						// sound:["temp/wall"], lock_ms:cm.randRange(200, 300)});
				}
			},

			moveToCursor: function(){

			},

			// weapon: null,
			nextWeapon: function(){
				var activeWeapon, nextWeapon, found = false;
				for(var id in cm.playerData.activeWeapons){
					activeWeapon = cm.playerData.activeWeapons[id];
					break;
				}
				var weapons = cm.playerData.itemsByTypeId[cm.consts.ITEM_TYPE_WEAPON];
				for(var id in weapons){
					var item = weapons[id];
					if(nextWeapon === undefined){
						nextWeapon = item;
					}
					if(found){
						// this.weapon = i;
						// cm.playerData.activeWeapon = item;
						// this.level.activateItem(item);
						nextWeapon = item;
						break;
					}
					// if(this.weapon == i){
					if(activeWeapon == item){
						found = true;
					}
				};
                // [begin debug]
				// console.log('nextWeapon', cm.playerData.activeWeapons, activeWeapon, weapons, nextWeapon, cm.consts.ITEM_TYPE_MONSTER);
                // [end debug]
				// this.weapon = firstWeapon;
				// cm.playerData.activeWeapon = firstWeapon;
				this.level.activateItem(nextWeapon);
			},

			spawnBulletTimer: null,
            spawnBulletLockEndTime: null,
			startFire: function(){
				var self = this;
				if(!this.spawnBulletTimer){
					this.endFire();
					// this.nextWeapon();
                    var cur_time = cm.getTimeMS();
                    if(self.spawnBulletLockEndTime > cur_time){
                        setTimeout(function(){self.startFire();}, cm.ceil(self.spawnBulletLockEndTime - cur_time));
                        return;
                    }

					for(var id in cm.playerData.activeWeapons){
						var weaponItem = cm.playerData.activeWeapons[id]; // cm.param(cm.playerData.activeWeapon, cm.playerData.defaultWeapon);
						var weapon = weaponItem.actorParams; // cm.weapons[this.weapon];
						// var ms = cm.max(100, 1000.0 / cm.param(weapon.frequency, 1000.0 / 300) * Math.pow(0.9, this.level.params.day-1 + this.level.wave.phase*0.1));
						var dt = 0, step = 0;
						(function spawnNextBullet(){
							self.spawnBullet(step++);
							var new_dt = cm.round(cm.max(10, 1000.0 / (cm.param(weaponItem.frequency, 1000.0 / 500) * cm.playerData.effects.scale.weaponFrequency)));
							if(dt != new_dt){
								dt = new_dt;
								self.endFire();
								self.spawnBulletTimer = setInterval(spawnNextBullet, dt);
							}
                            self.spawnBulletLockEndTime = cm.getTimeMS() + dt;
						})();
						break; // multi activated weapons are not supported
					}
				}
			},
			endFire: function(){
				clearInterval( this.spawnBulletTimer );
				this.spawnBulletTimer = null;
				// cm.sound.stop({actor:"player", channel:"fire"});
			},
			isShooting: function(){
				return this.spawnBulletTimer != null;
			},

			mouseMove: function(mouseEvent){
				cm.Player.superclass.mouseMove.call(this, mouseEvent);
				/*
				var actor = mouseEvent.source;
				cm.log( "[P]"
						+ " P: " + cm.round(mouseEvent.point.x) + " " + cm.round(mouseEvent.point.y)
						+ " S: " + cm.round(mouseEvent.screenPoint.x) + " " + cm.round(mouseEvent.screenPoint.y)
						+ ", A: " + cm.round(actor.x) + " " + cm.round(actor.y)
						);
				*/
			},

			dirIndex: null,
			isRunning: null,

			animate: function(director, time){
				cm.animateActorSprite(this);
				return cm.Player.superclass.animate.call(this, director, time);
			},

			stopDampingUpdated: true,
			playerSpeedScale: null,

			endAnimate: function(director, time){
				if(!cm.paused && this.level.player == this && this.physicsBody){
					var dir = cm.keysToDir();
					if(dir.x || dir.y){
                        this.controlTime = this.time; // cm.getTimeMS();
                        this.damageCount = 0;
						if(this.stopDampingUpdated){
							this.physicsBody.m_linearDamping = 1 - cm.param(this.desc.physics.linearDamping, cm.physics.DEF_LINEAR_DAMPING);
							this.physicsBody.m_angularDamping = 1 - cm.param(this.desc.physics.angularDamping, cm.physics.DEF_ANGULAR_DAMPING);
							this.stopDampingUpdated = false;
						}

						if(this.playerSpeedScale === null || this.playerSpeedScale != cm.playerData.effects.scale.playerSpeed){
							this.playerSpeedScale = cm.playerData.effects.scale.playerSpeed;
							this.setMaxSpeed(this.originSpeed * this.playerSpeedScale);
							// [begin debug]
                            if(cm.logEnabled) cm.log('player max speed changed', this.desc.physics.maxSpeed);
                            // [end debug]
						}

						cm.applyActorForce(this, dir.multiply(this.desc.physics.forcePower), {
							// speedScale:,
							isPlayer:true
						});
					}else{
						if(!this.stopDampingUpdated){
							this.physicsBody.m_linearDamping = 1 - cm.param(this.desc.physics.stopLinearDamping, 0.04);
							this.physicsBody.m_angularDamping = 1 - cm.param(this.desc.physics.stopAngularDamping, 0.04);
							this.stopDampingUpdated = true;
						}
					}
					// cm.applyActorForce(this, cm.keysToDir().multiply(this.desc.physics.forcePower), undefined, true);
					// cm.log("[player move] force "+this.desc.physics.forcePower+" "+dir.x+" "+dir.y);
					if(this.physicsBody.GetLinearVelocity().Length() > 5){
						this.playFootstepSound();
					}
				}
				return cm.Player.superclass.endAnimate.call(this, director, time);
			}
		};

		extend(cm.Player, CAAT.ActorContainer, null);
	})();

	(function(){
		cm.Monster = function(){
			cm.Monster.superclass.constructor.call(this);
			return this;
		};

		cm.Monster.prototype = {
			level: null,

			create: function(level, params){
				cm.Monster.superclass.create.call(this);

				this.level = level;
				// cm.log('[Monster.create] setupActor');
				cm.setupActor(this, cm.extend({
					center: {x: cm.director.width * cm.randRange(0.2, 0.8), y: cm.director.height * cm.randRange(0.2, 0.8)},
					image: {
						size: [ 20, 1 ],
						ms: 200
					},
					sounds: {
						pain: [ "unknown" ], // "temp/paind", "temp/painb", "temp/giant1", "temp/giant2", "temp/giant3", "temp/giant4" ],
						death: [ "unknown" ], // "temp/deathe", "temp/deathb", "temp/deathd" ],
						idle: [ "unknown" ]
					},
					health: 10,
					fire: {
						day: 1,
						weapon: 5,
						frequency: 1000.0 / 500.0,
						speed: 100,
						damage: 10,
						density: 0.5
					},
					physics: {
						radiusScale: 1,
						density: 1.0,
						minSpeed: 20,
						maxSpeed: 100,
						linearDamping: 0,
						// friction: 0.5,
						restitution: 0.2,
						forcePower: 1000,
						inversePower: 2000,
						stopPercent: 10,
						stopDurationMS: [1.0, 3.0],
						aimOnDamage: "inverse",
						aimIntervalSec: 3.0,
						aimDurationSec: [2.0, 4.0],
						pathWalkDurationSec: [20.0, 30.0],
						inverseDurationSec: [2.0, 4.0],
						categoryBits: cm.physics.CAT_BIT_MONSTER,
						ignoreBits: cm.physics.CAT_BIT_MONSTER_AREA | cm.physics.CAT_BIT_POWERUP | cm.physics.CAT_BIT_BLOOD
					}
				}, params));

				// this.desc.physics.forcePower *= 1.0;
				// this.desc.physics.inversePower *= 1.0;

				cm.each(this.desc.sounds, function(i, channel){
					cm.each(channel, function(i, id){
						if(cm.sound.register(id)){
							// cm.log('[sound] load '+id);
						}
					});
				});

				return this;
			},

			dirIndex: null,
			isRunning: null,

			// aimTimer: null,
			aimTime: 0,
			aimType: true,
			aimInverse: false,
			stopped: false,
			startContinualTime: 0,
			endContinualTime: 1000,
			bonusScale: 1,

			onDestroy: function(){
				// clearTimeout(this.aimTimer);
				if(this.deleteOnFailed){
					return;
				}

                function getCount(val){
                    var count = Math.floor(val);
                    if(count <= 2 && (val -= count) > 0 && cm.rand() <= val){
                        count++;
                    }
                    if(count >= 2 && cm.rand() <= count*10/100.0){
                        count--;
                    }
                    return count;
                };

				// var moneyCount = (this.desc.health / 200.0) / Math.pow(Math.max(1, cm.playerData.levels));
				// moneyCount = cm.ceil(Math.min(3, moneyCount*0.8) * this.level.wave.params.moneyPerArmor/2 * this.bonusScale);
                // var levelsFactor = 1.0 / Math.pow(Math.max(1, cm.playerData.levels), 0.8);
                var levelsFactor;
                if(this.level.params.level < 1){
                    levelsFactor = 4;
                }else{
                    levelsFactor = 1.0 / Math.pow(Math.max(1, this.level.params.level-0.5), 1.4);
                }
                var moneyCount = getCount(Math.min(2, (this.desc.health / 50.0) * 0.8 * this.bonusScale * levelsFactor));
                // console.log('spawn moneyCount', moneyCount, this.desc.health, this.bonusScale, cm.playerData.levels, levelsFactor, Math.pow(Math.max(1, cm.playerData.levels-0.5), 1.4));

				var meatCount = 0;
				var damaged = this.damaged + this.desc.health * (1 - cm.playerData.effects.scale.monsterHealth);
				if(damaged >= this.desc.health){
                    /*
					if(this.desc.health >= 100){
                        meatCount = this.desc.health / 100.0;
					}else if(cm.rand() <= this.desc.health / 100){
                        meatCount = 1;
                    }
                    meatCount = cm.ceil(meatCount * cm.randRange(0.5, 1.5) / 4 * this.level.wave.params.meatPerHealth/2 * this.bonusScale);
                    */
                    if(this.level.params.level < 1){
                        levelsFactor = 1;
                    }
                    meatCount = getCount(Math.min(3, this.desc.health * 0.7 * this.bonusScale * levelsFactor / 100.0));
                    // console.log('spawn meatCount', meatCount, this.desc.health, this.bonusScale);
				}
                // console.log('bonusScale', this.bonusScale, meatCount, this.desc, cm.playerData.effects);
				var createMeat = function(owner){
					var level = owner.level;
					for(var i = 0; i < meatCount; i++){
						// cm.log('[createMeat] createActor');
						var meat = cm.createActor(level, CAAT.ActorContainer, cm.clone({
							center: cm.getActorCenter(owner),
							image: {id: "meat"},
							// shape: false,
							angle: 0,
							targetDir: /*new*/ cm.Point( cm.randSign(), cm.randSign() ).normalize(),
							physics: {
								radiusScale: 1,
								speed: 130 + cm.randSign()*10,
								density: 0.5,
								linearDamping: 0.1 + cm.randSign()*0.02,
								categoryBits: cm.physics.CAT_BIT_POWERUP
							},
							life: {
								behaviors: [
									{
										duration: 1000 + cm.rand() * 500,
										alpha: [ 0, 1 ]
									},
									{
										start: 10000 + cm.rand() * 1000,
										duration: 600,
										behaviors: [ {
											duration: 200,
											pingpong: true,
											cycle: true,
											alpha: [0, 1]
										} ]
									},
									{
										start: 12000 + cm.rand() * 1000,
										duration: 5000,
										alpha: [ 1, 0 ]
									}
								]
							}
						}));
						level.layers[level.LAYER.GOLDS].addChild( meat );
					}
					level.fixGoldsNumber();
				};
				if(this.dieActor){
					this.dieActor.onDestroy = function(){
						createMeat(this);
					};
				}else{
					createMeat(this);
				}

				// add money to the level
				var owner = this;
				var level = owner.level;
				for(var i = 0; i < moneyCount; i++){
					// cm.log('[createMoney] createActor');
					var money = cm.createActor(level, CAAT.ActorContainer, cm.clone({
						center: cm.getActorCenter(owner),
						image: {id: "money"},
						// shape: false,
						angle: 0,
						targetDir: /*new*/ cm.Point( cm.randSign(), cm.randSign() ).normalize(),
						spawnOffs: 10,
						physics: {
							radiusScale: 1,
							density: 0.5,
							speed: 150 + cm.randSign()*20,
							linearDamping: 0.1 + cm.randSign()*0.02,
							categoryBits: cm.physics.CAT_BIT_POWERUP
						},
						life: {
							behaviors: [
								{
									start: 0,
									duration: 1000,
									alpha: [0, 1]
								},
								{
									start: 1000 + cm.rand() * 500,
									duration: 600,
									behaviors: [
										{
											duration: 200,
											pingpong: true,
											cycle: true,
											alpha: [0, 1]
										}
									]
								},
								{
									start: 10000 + cm.rand() * 1000,
									duration: 600,
									behaviors: [ {
										duration: 200,
										pingpong: true,
										cycle: true,
										alpha: [0, 1]
									} ]
								},
								{
									start: 12000 + cm.rand() * 1000,
									duration: 5000,
									alpha: [ 1, 0 ]
								}
							]
						}
					}));
					level.layers[level.LAYER.GOLDS].addChild( money );
				}
				level.fixGoldsNumber();
			},

			playPainSound: function(){
				// cm.log("playPainSound", this.desc.sounds.pain);
				cm.sound.play({actor:this.desc.image.id, channel:'pain', sound:this.desc.sounds.pain});
			},

			playDeathSound: function(){
				cm.sound.play({actor:this.desc.image.id, channel:'death', sound:this.desc.sounds.death});
			},

			playIdleSound: function(){
				cm.sound.play({actor:this.desc.image.id, channel:'idle', sound:this.desc.sounds.idle, lock_ms: 10000});
			},

			getAimIntervalMS: function(){
				return cm.randTimeMS(this.desc.physics.aimIntervalSec);
			},

			getAimDurationMS: function(){
				return cm.randTimeMS(this.desc.physics.aimDurationSec);
			},

			getPathWalkDurationMS: function(){
				if(this.desc.physics.pathWalkDurationSec){
					return cm.randTimeMS(this.desc.physics.pathWalkDurationSec);
				}
				return cm.randTimeMS(this.desc.physics.aimDurationSec);
			},

			getInverseDurationMS: function(){
				if(this.desc.physics.inverseDurationSec){
					return cm.randTimeMS(this.desc.physics.inverseDurationSec);
				}
				return Math.min(2000, cm.randTimeMS(this.desc.physics.aimDurationSec));
			},

			getStopDurationMS: function(){
				if(this.desc.physics.stopDurationSec){
					return cm.randTimeMS(this.desc.physics.stopDurationSec);
				}
				return Math.min(2000, cm.randTimeMS(this.desc.physics.aimDurationSec));
			},

			onPhysicsContact: function(contact, i){
				var other = i ? contact.m_shape1 : contact.m_shape2;

				/* if(other.m_body.actor && other.m_body.actor.desc && other.m_body.actor.desc.image)
				cm.log('[monster contact]',
					other.m_body.actor && other.m_body.actor.desc && other.m_body.actor.desc.image && other.m_body.actor.desc.image.id,
					other.m_body.actor); */

				if(other.m_categoryBits & cm.physics.CAT_BIT_PLAYER_FIRE){
					if(this.desc.physics.aimOnDamage
							/* && (this.desc.physics.aimOnDamage == "inverse"
									|| this.time - this.aimTime > this.desc.physics.aimOnDamageSec * 1000)*/)
					{
						if(this.desc.physics.aimOnDamage === true){
							this.pathNextTime = this.time - 10000;
						}
						this.moveMonster( this.desc.physics.aimOnDamage );
						// cm.log("[aim on damage] "+this.desc.image.id+", "+this.desc.physics.aimOnDamage);
					}
				}else if(other.m_categoryBits & cm.physics.CAT_BIT_PLAYER){
					if(!other.m_isSensor) //this.desc.physics.inverseDurationSec !== undefined)
					{
						// var other = other.m_body.actor;
						// other.playPainSound();

						this.playIdleSound();
						this.moveMonster("inverse");
						// cm.log("[touch player] "+this.desc.image.id);
					}
				}else if(other.m_categoryBits & cm.physics.CAT_BIT_MONSTER){
					var other = other.m_body.actor;

					// other.physicsBody.ApplyForce( this.aimForce, other.physicsBody.GetCenterPosition() );
					// cm.applyActorForce(other, {x:this.aimForce.x*2, y:this.aimForce.y*2});
					if(cm.use_monsters_battle && this.desc.battleSide != other.desc.battleSide){
						other.moveMonster("inverse");
						if(/*this.aim === true &&*/ other.time - other.damagedTime > 300){
							other.damagedTime = other.time;
							other.damaged += 10;
							if(other.damaged >= other.desc.health){
								cm.dieActor(other);
							}else if(!other.path && other.target !== this){
								other.target = this;
								other.path = false;
								other.pathNextTime = other.time - 10000;
							}
						}
						this.moveMonster("inverse");
						if(/*other.aim === true &&*/ this.time - this.damagedTime > 300){
							this.damagedTime = this.time;
							this.damaged += 10;
							if(this.damaged >= this.desc.health){
								cm.dieActor(this);
							}else if(!this.path && this.target !== other){
								this.target = other;
								this.path = false;
								this.pathNextTime = other.time - 10000;
							}
						}
						return true;
					}else  if(!this.aimInverse){ // && !other.aimInverse){

						/* if(this.path && other !== this && !other.path && !other.aimInverse && !other.stopped
							&& other.desc.physics.fly == this.desc.physics.fly)
						{
							// var dist = cm.getActorsDistance(this, other);
							// if(dist < 500 && level.traceActors(this, other, this.desc.physics.fly)){
								other.pathFailed = 0;
								other.pathIndex = this.pathIndex;
								// other.playerTraceNextTime = this.playerTraceNextTime;
								other.pathNextTime = other.time + 100; // this.pathNextTime;
								cm.log("[path cloned on touch] "+other.desc.image.id);
							// }
						} */

						var selfPathUsed = this.aimType === true /*!this.aimInverse && !this.stopped*/ && this.path;
						var otherPathUsed = other.aimType === true /*!other.aimInverse && !other.stopped*/ && other.path;

						var level = this.level;
						var target = this.target ? this.target : level.player;
						if(selfPathUsed && otherPathUsed){
							var remain = this.path.length - this.pathIndex;
							var remainOther = other.path.length - other.pathIndex;
							var actor = remain < remainOther && level.traceActors(other, target, other.desc.physics.fly) ? this : other;
							if(1){
								actor.moveMonster("inverse");
								cm.applyActorForce(actor, {x:actor.aimForce.x*3, y:actor.aimForce.y*3}, {noClipForce:true});
								// cm.log("[push monster] "+actor.desc.image.id);
							}
							return true;
							// cm.applyActorForce(actor, {x:actor.aimForce.x*2, y:actor.aimForce.y*2});
						}else if(selfPathUsed || otherPathUsed){
							/* var actor = otherPathUsed ? this : other;
							if(level.traceActors(actor, level.player, actor.desc.physics.fly)){
								actor.moveMonster("inverse");
								cm.applyActorForce(actor, {x:actor.aimForce.x*2, y:actor.aimForce.y*2});
								cm.log("[push monster2] "+actor.desc.image.id);
								// return true;
							}else{
								// cm.applyActorForce(this, {x:this.aimForce.x*10, y:this.aimForce.y*10}, true);
							}
							return true; */
						}
					}
				}else if(other.m_categoryBits & (cm.physics.CAT_BIT_STATIC | cm.physics.CAT_BIT_HOLE)){
					if(this.time > (this.endContinualTime + this.startContinualTime)/2 && /*this.isMonsterVisible &&*/ this.aimInverse){
						// this.endContinualTime = 0;
						// this.path = false;
						// cm.log("[break inverse] "+this.desc.image.id+", wall is touched");
						// this.moveMonster(cm.randItem([false, "stop"]));
					}
				}
			},

			spawnBullet: function(){
				var level = this.level;
				var waveParams = level.wave.params;

				var bulletsLayer = level.layers[level.LAYER.MONSTER_BULLETS];
				if(bulletsLayer.childrenList.length >= waveParams.monsterFireMaxBullets){
					// cm.log("[monster fire] skipped, max bullets reached "+bulletsLayer.childrenList.length);
					return;
				}
				var fireIntervalSec = (level.time - level.monsterFireTime) * 0.001;
				if(fireIntervalSec < waveParams.monsterFireIntervalSec){
					// cm.log("[monster fire] skipped, time is blocked "+cm.round(fireIntervalSec, 2)+" "+waveParams.monsterFireIntervalSec);
					return;
				}

				var target = this.target ? this.target : level.player;
                if(!target || (target == level.player && cm.playerData.playTimeSec < level.player.protectionEndTimeSec)){
                    return;
                }
				var targetPos = cm.getActorCenter(target);
				var monsterPos = cm.getActorCenter(this);
				var targetDir =	targetPos.subtract(monsterPos);
				var dist = targetDir.getLength();
				if(dist < waveParams.monsterFireMinDistance){
					// cm.log("[monster fire] skipped due to dist "+cm.round(dist)+" < "+waveParams.monsterFireMinDistance);
					return;
				}

				level.monsterFireTime = level.time;
				// this.dirIndex = cm.dirToIndex( aim.targetDir );
				var weaponItem = cm.playerData.itemsById[this.desc.fire.weaponId];
				if(!weaponItem || weaponItem.typeId != cm.consts.ITEM_TYPE_WEAPON){
					return;
				}

				var scale = cm.playerData.effects.scale;
				var bullet = /*new*/ cm.Bullet().create(this, cm.extend(weaponItem.actorParams, { // cm.weapons[this.desc.fire.weapon_id], {
					center: monsterPos,
					targetDir: targetDir.multiply(1.0 / dist),
					damage: this.desc.fire.damage * scale.monsterHealth,
					physics: {
						density: this.desc.fire.density,
						speed: this.desc.fire.speed * scale.monsterSpeed,
						categoryBits: cm.physics.CAT_BIT_MONSTER_FIRE,
						ignoreBits: 0
							// | cm.physics.CAT_BIT_PLAYER_FIRE
							| cm.physics.CAT_BIT_MONSTER_FIRE
							| (cm.use_monsters_battle ? 0 : cm.physics.CAT_BIT_MONSTER)
							| cm.physics.CAT_BIT_HOLE | cm.physics.CAT_BIT_MONSTER_AREA
							| cm.physics.CAT_BIT_BLOOD
							// | cm.physics.CAT_BIT_POWERUP
					},
					life: {
						// start: owner.time,
						behaviors: [
							{
								alpha: true,
								start: 3000,
								duration: 500
							}
						]
					}
				}));
				bulletsLayer.addChild(bullet);
			},

			path: false,
			pathIndex: 0,
			pathFailed: 0,
			pathValid: 0,
			pathTime: 0,
			pathNextTime: 0,
			target: null,

			updatePath: function(){
				var level = this.level;
				this.pathTime = this.time;

				if(!cm.use_monsters_battle){
					this.target = level.player;
                    if(!this.target){
                        return;
                    }
				}else{
					if(cm.isActorDead(this.target)){
						this.target = null;
						var bestDist = 99999999999;
						var monsterList = level.layers[level.LAYER.MONSTERS].childrenList;
						for(var i = 0; i < monsterList.length; i++){
							var monster = monsterList[i];
							if(monster !== this && monster.desc.battleSide != this.desc.battleSide){
								var dist = cm.getActorsDistance(this, monster);
								if(bestDist > dist){
									bestDist = dist;
									this.target = monster;
								}
							}
						}
						if(!this.target){
							this.path = false;
							this.pathNextTime = this.time + cm.randRange(100, 200);
							return; // false;
						}
					}
				}

				var checkPath = !this.path || this.time >= this.pathNextTime;
				if(checkPath){
					var dist = 0;
					if(this.isMonsterVisible){
						dist = cm.round(cm.getActorsDistance(this, this.target));
						// cm.log("[dist] "+dist+" "+this.desc.image.id);
					}
					if(dist < 200 && level.traceActors(this, this.target, this.desc.physics.fly)){
						this.path = false;
						this.pathNextTime = this.time + cm.randRange(100, 200);
						return; // false;
					}
				}

				if(checkPath){
					this.pathNextTime = this.time + cm.randRange(100, 200);
					var p1 = level.actorToTileMapPos(this);
					var p2 = level.actorToTileMapPos(this.target);

					if(this.path && this.pathValid <= 10){
						this.pathValid++;
						var node = this.path[this.path.length-1];
						if(cm.abs(node.x - p2.x) <= 1 && cm.abs(node.y - p2.y) <= 1){
							// cm.log("[path] cur path is still valid");
							return;
						}
					}

					this.pathFailed++;
					this.pathValid = 0;

					var self = this;
					level.findTiledMapPath(p1, p2, this, this.desc.physics.fly, true, function(path){
						if(!path || cm.isActorDead(self)){
							return;
						}
						self.path = path;
						self.pathFailed = 0;
						self.pathValid = 1;
						self.pathIndex = 0;
						// self.pathTime = self.time;

						if(1){
							var monsterList = level.layers[level.LAYER.MONSTERS].childrenList;
							for(var i = 0; i < monsterList.length; i++){
								var monster = monsterList[i];
								if(monster !== self && !monster.path // && !monster.aimInverse && !monster.stopped
									&& monster.desc.physics.fly == self.desc.physics.fly
									&& (!cm.use_monsters_battle || monster.desc.battleSide == self.desc.battleSide))
								{
									var dist = cm.getActorsDistance(self, monster);
									if(dist < 100 && level.traceActors(self, monster, self.desc.physics.fly)){
										monster.path = self.path;
										monster.pathFailed = 0;
										monster.pathIndex = self.pathIndex;
										monster.pathNextTime = monster.time + cm.randRange(100, 200);
										monster.target = self.target;
										// cm.log("[path cloned on new path] "+monster.desc.image.id);
									}
								}
							}
						}

						if(cm.use_path_debug){
							level.layers[level.LAYER.PATH].destroyChildren();
							for(var i = 0; i < self.path.length; i++){
								var node = self.path[i];
								var pos = level.tiledMapToActorPos(node);
								var checkpoint = cm.createActor(level, CAAT.ActorContainer, cm.clone({
									center: pos,
									radius: 5,
									fillStyle: "#ff5555"
								}));
								level.layers[level.LAYER.PATH].addChild(checkpoint);
							}
						}
					});
				}
				// return !!this.path;
			},

			pathMoveStep: 0,
			pathMoveMonster: function(){
				if(!this.path || !this.physicsBody){
					return false;
				}

				var level = this.level;

				var from = cm.getActorCenter(this);
				var p1 = level.actorPosToTileMapPos(from);

				var newIndex, node;
				for(var i = this.path.length-1; i >= this.pathIndex; i--){
					node = this.path[i];
					if(cm.abs(node.x - p1.x) <= 1 && cm.abs(node.y - p1.y) <= 1){
						newIndex = i+1;
						break;
					}
				}
				if(newIndex !== undefined){
					if(newIndex >= this.path.length){
						this.path = false;
						// cm.log("[path] finished");
						return false;
					}
					this.pathIndex = newIndex;
					node = this.path[ this.pathIndex ];
					// cm.log("[path] new node "+this.pathIndex+", pos "+node.x+" "+node.y);
				}else{
					node = this.path[ this.pathIndex ];
				}

				var to = level.tiledMapToActorPos(node);
				// cm.log("[path] node "+this.pathIndex+", to pos "+to.x+" "+to.y+", from "+from.x+" "+from.y);

				this.pathMoveStep = (this.pathMoveStep + 1) % 2; // 4;
				if(!this.pathMoveStep){
                    var maxSpeed, curSpeed;
                    if(this.isMonsterVisible){
                        maxSpeed = cm.physics.viewToPhysScalar( this.desc.physics.maxSpeed );
                        curSpeed = this.physicsBody.GetLinearVelocity().Length();
                        maxSpeed = Math.min(maxSpeed, Math.max(maxSpeed * 0.1, curSpeed * 1.1));
                        maxSpeed *= cm.playerData.effects.scale.monsterSpeed;
                    }else{
                        maxSpeed = cm.physics.viewToPhysScalar( cm.hiddenMonsterPathSpeed );
                        curSpeed = this.physicsBody.GetLinearVelocity().Length();
                        maxSpeed = Math.min(maxSpeed, Math.max(maxSpeed * 0.1, curSpeed * 1.1));
                    }
					var speed = /*new*/ b2Vec2(to.x - from.x, to.y - from.y).Norm(maxSpeed);
					this.physicsBody.WakeUp();
					this.physicsBody.SetLinearVelocity( speed );
					// cm.log("[path move] set speed: "+cm.round(speed.x, 1)+" "+cm.round(speed.y, 1));
				}else{
					var forcePower = this.desc.physics.forcePower;
					this.aimForce = /*new*/ cm.Point(to.x - from.x, to.y - from.y).setLength(forcePower * 0.9);
					cm.applyActorForce(this, this.aimForce, {speedScale: cm.playerData.effects.scale.monsterSpeed});
					// cm.log("[path move] apply force: "+cm.round(force.x, 1)+" "+cm.round(force.y, 1));
				}
				return true;
			},

			moveMonster: function(aim){
				if(!this.physicsBody || cm.paused){
					return;
				}
				this.nextMoveTime = this.time + 50;
				this.aimInverse = false;
				this.stopped = false;
				var isContinualPhase = this.time < this.endContinualTime;
				// cm.log("[moveMonster] "+this.time+" "+aim+" "+this.aimType+" "+isContinualPhase);
				if(aim === undefined){
					aim = this.aimType;
					if(isContinualPhase && aim && this.time >= this.checkContinualTime){
						var curPos = cm.getActorCenter(this);
						var moveDist = this.startPos.subtract(curPos).getLength();
						this.startPos = curPos;
						if(moveDist < 20){
							switch(aim){
							case "inverse":
								// cm.log("[monster move] dist "+cm.round(moveDist)+", inverse => true");
								isContinualPhase = false;
								aim = true;
								break;
							case "stop":
							case false:
								break;
							// case true:
							default:
								// cm.log("[monster move] dist "+cm.round(moveDist)+", true => inverse");
								isContinualPhase = false;
								aim = this.isMonsterVisible
										// && this.level.traceActors(this, this.level.player, this.desc.physics.fly)
										? "inverse" : true;
								break;
							}
						}else{
							this.checkContinualTime += 2000;
						}
					}else if(!isContinualPhase){
						if(this.aimType === true){
							this.spawnBullet();
							aim = this.isMonsterVisible ? "inverse" : true;
						}else{
							aim = this.time - this.aimTime >= this.getAimIntervalMS();
						}
						// cm.log("[aim] "+aim);
					}
				}
				var target = this.target; // ? this.target : this.level.player;
				if(cm.use_monsters_battle){
					if(cm.isActorDead(target)){
						aim = false;
					}
				}else{
					if(!target){
						target = this.level.player;
					}
					if(!target || cm.isActorDead(target)){
						aim = false;
					}
				}
                /* if(aim != "inverse" && target && target.protectionEndTimeSec
                    && cm.playerData.playTimeSec < target.protectionEndTimeSec
                    && cm.getActorsDistance(this, target) < cm.protectDistance)
                {
                    aim = "inverse";
                } */
				if(aim == "stop") aim = this.isMonsterVisible ? false : true;
				var aimChanged = aim != this.aimType;
				if(!aim)
				{
					this.aimType = aim;
					if(aimChanged || !isContinualPhase){
						this.startContinualTime = this.time;
						this.endContinualTime = this.time + 1000; // this.getAimDurationMS();
						this.checkContinualTime = this.endContinualTime;
						this.aimForce = /*new*/ b2Vec2( cm.randSign(), cm.randSign() * 0.5 );
						this.aimForce.Normalize();
						this.aimForce = cm.physics.physVecToView(this.aimForce).multiply(this.desc.physics.forcePower);
					}
					cm.applyActorForce(this, this.aimForce, {speedScale: cm.playerData.effects.scale.monsterSpeed});
					// cm.log("[apply free aim] "+aim+" "+this.time+" "+this.desc.image.id);
					return;
				}
				/* if(aim == "stop" || (aim === true
						&& this.isMonsterVisible
						&& this.desc.physics.stopPercent !== undefined
						&& cm.randRange(1, 100) <= this.desc.physics.stopPercent))
				{
					this.aimType = "stop";
					this.stopped = true;
					if(aimChanged || !isContinualPhase){
						// this.aimTime = this.time;
						this.startContinualTime = this.time;
						this.endContinualTime = this.time + this.getStopDurationMS();
						this.checkContinualTime = this.endContinualTime;
						this.nextMoveTime = this.endContinualTime;
					}
					return;
				} */
				if(aim == "inverse"){
					this.aimType = "inverse";
					this.aimInverse = true;
					if(aimChanged || !isContinualPhase){
						// this.aimTime = this.time;
						this.startPos = cm.getActorCenter(this);
						this.startContinualTime = this.time;
						this.endContinualTime = this.time + this.getInverseDurationMS();
						this.checkContinualTime = this.time + 2000;
					}
				}else{
					this.aimType = true;
					if(aimChanged || !isContinualPhase){
						this.aimTime = this.time;
						this.startPos = cm.getActorCenter(this);
						this.startContinualTime = this.time;
						this.endContinualTime = this.time + this.getAimDurationMS();
						this.checkContinualTime = this.time + 2000;
					}
				}
				// cm.log("[pathMoveMonster] "+(this.nextMoveTime - this.time));
				if(!this.aimInverse && this.pathMoveMonster()){
					// this.aimType = aim;
					if(aimChanged || !isContinualPhase){
						this.endContinualTime = this.time + this.getPathWalkDurationMS();
					}
					return;
				}
				// var playerPos = target.physicsBody.GetCenterPosition();
				var playerPos = target.physicsBody ? target.physicsBody.GetCenterPosition() : cm.physics.viewToPhysVec(cm.getActorCenter(target));
				var monsterPos = this.physicsBody.GetCenterPosition();
				var force = playerPos.Copy(), forcePower;
				force.Subtract(monsterPos);
				force.Normalize();
				if(this.aimInverse){ // || cm.key.isPressed(cm.key.SPACE)){
					force = force.Negative();
				}
				if(this.aimInverse && this.desc.physics.inversePower){
					forcePower = this.desc.physics.inversePower;
				}else{
					forcePower = this.desc.physics.forcePower;
				}
				this.aimForce = cm.physics.physVecToView(force).multiply(forcePower);
				cm.applyActorForce(this, this.aimForce, {speedScale: cm.playerData.effects.scale.monsterSpeed});
				// cm.log("[apply aim] "+aim+" "+this.desc.image.id+" "+this.time+" "+(this.time < this.endContinualTime));
			},

			isMonsterVisible: false,
			nextMoveTime: 0,
			animate: function(director, time){
				if(this.pathFailed >= 10){
					// [begin debug]
                    if(cm.logEnabled) cm.log("[kill] "+this.desc.image.id+" is in stick");
                    // [end debug]
					this.deleteOnFailed = true;
					cm.deleteActor(this);
					return;
				}

				if(time >= this.nextMoveTime){
					this.moveMonster(); // this.desc.physics.aimMoveOnly || this.desc.physics.aim ? true : this.aimType);
				}

				cm.animateActorSprite(this);

				var x = this.x + this.level.view.x;
				var y = this.y + this.level.view.y;
				var edge = 5;
				this.isMonsterVisible = x + this.width >= edge
						&& x < this.level.width - edge
						&& y + this.height >= edge
						&& y < this.level.height - edge;

				if(this.stopped){
					if(!this.stopDampingUpdated){
						this.physicsBody.m_linearDamping = 1 - cm.param(this.desc.physics.stopLinearDamping, 0.02);
						this.physicsBody.m_angularDamping = 1 - cm.param(this.desc.physics.stopAngularDamping, 0.02);
						this.stopDampingUpdated = true;
					}
					// var speed = cm.physics.physVecToView( this.physicsBody.GetLinearVelocity() );
					// force = speed.normalize().multiply( -this.desc.physics.forcePower );
					// cm.applyActorForce(this, force);
				}else{
					if(this.stopDampingUpdated){
						this.physicsBody.m_linearDamping = 1 - cm.param(this.desc.physics.linearDamping, cm.physics.DEF_LINEAR_DAMPING);
						this.physicsBody.m_angularDamping = 1 - cm.param(this.desc.physics.angularDamping, cm.physics.DEF_ANGULAR_DAMPING);
						this.stopDampingUpdated = false;
					}
				}
				return cm.Monster.superclass.animate.call(this, director, time);
			},

			paint: function(director, time){
				cm.Monster.superclass.paint.call(this, director, time);

				var ctx = director.crc;

				if(0 && this.isMonsterVisible){
					ctx.strokeStyle = "#0000ff";
					ctx.beginPath();
					ctx.strokeRect(0, 0, this.width, this.height);
					ctx.stroke();
				}

				if(this.desc.health > 0 && time - this.damagedTime < 5000)
				{
					var damaged = this.damaged + this.desc.health * (1 - cm.playerData.effects.scale.monsterHealth);
					var t = 1 - cm.clamp(damaged / this.desc.health, 0, 1);
					if(t >= 0.7){
						cur = [ 0, 200, 0 ];
					}else if(t >= 0.35){
						cur = [ 200, 200, 0 ];
					}else{
						cur = [ 200, 0, 0 ];
					}

					ctx.fillStyle= "rgb("+cur[0]+","+cur[1]+","+cur[2]+")";
					ctx.beginPath();
					ctx.fillRect(0, this.height, this.width * t, 5);
					ctx.fill();

					ctx.strokeStyle = "#000000";
					ctx.beginPath();
					ctx.strokeRect(0, this.height, this.width, 5);
					ctx.stroke();
				}
			}
		};

		extend(cm.Monster, CAAT.ShapeActor, null);
	})();

	(function(){
		cm.AnchorText = function(){
			cm.AnchorText.superclass.constructor.call(this);
			return this;
		};

		cm.AnchorText.prototype = {
			locationX: 0,
			locationY: 0,
			locationAnchor: null, // CAAT.Actor.prototype.ANCHOR_TOP_LEFT,

			setLocationAnchor: function(x, y, anchor){
				this.locationX = x;
				this.locationY = y;
				this.locationAnchor = anchor;
				this.width = this.height = 0;
				this.textWidth = this.textHeight = 0;
			},

			setText : function( sText ){
				this.width = this.height = 0;
				this.textWidth = this.textHeight = 0;
				return cm.AnchorText.superclass.setText.call(this, sText);
			},

			paint : function(director, time) {
				if(this.locationAnchor != null
						&& this.text != null
						&& this.path == null
						&& ( this.textWidth==0 || this.textHeight==0 )){
					this.calcTextSize(director);
					var p = this.getAnchor(this.locationAnchor);
					this.setLocation(this.locationX - p.x, this.locationY - p.y)
				}
				cm.AnchorText.superclass.paint.call(this, director, time);
			}
		};

		extend(cm.AnchorText, CAAT.TextActor, null);
	})();


	(function(){
		cm.LevelHUD = function(){
			cm.LevelHUD.superclass.constructor.call(this);
			return this;
		};

		cm.LevelHUD.prototype = {
			level: null,

			moneyImage: null,
			moneyText: null,
			moneyCached: null,

			meatImage: null,
			meatText: null,
			meatCached: null,

            items: [],
            medals: [],

			face: null,
			armor: null,

			faceRow: 0,
            x_offs: 15,

			addAnchorText: function(){
				var text = /*new*/ cm.AnchorText().create();
				text.setText( "" );
				text.setFont( "32px bold sans-serif" );
				text.setFillStyle( "black" );
				// text.setOutline( true );
				text.setOutlineColor( "white" );
				this.addChild(text);
				return text;
			},

			create: function(level){
				cm.LevelHUD.superclass.create.call(this);

				this.level = level;
				this.setBounds( 0, 0, level.width, level.height );

                this.addChild(/*new*/ cm.ItemsHelper().create(level));

				this.face = cm.createActor(level, CAAT.ActorContainer, cm.clone({
					location: /*new*/ cm.Point(this.width-10-70-15, this.height-12),
					anchor: CAAT.Actor.prototype.ANCHOR_BOTTOM_RIGHT,
					image: {
						id: "player-face",
						size: [5, 5],
						animation: [0],
						ms: 400
					}
				}));
				this.addChild( this.face );

				this.armor = cm.createActor(level, CAAT.ActorContainer, cm.clone({
					location: /*new*/ cm.Point(this.width-10, this.height-12),
					anchor: CAAT.Actor.prototype.ANCHOR_BOTTOM_RIGHT,
					image: {
						id: "player-armor"
					}
				}));
				this.addChild( this.armor );

				// cm.log('[moneyImage] createActor');
                this.moneyImage = cm.createActor(level, CAAT.ActorContainer, cm.clone({
					location: /*new*/ cm.Point(this.x_offs, 10),
					anchor: CAAT.Actor.prototype.ANCHOR_TOP_LEFT,
					image: {
						id: "money"
					}
				}));
				this.addChild( this.moneyImage );

				this.moneyText = this.addAnchorText();
				this.moneyText.setLocationAnchor(
						this.moneyImage.x + this.moneyImage.width + 10,
						this.moneyImage.y + this.moneyImage.height/2,
						CAAT.Actor.prototype.ANCHOR_LEFT );

				// cm.log('[meatImage] createActor');
				this.meatImage = cm.createActor(level, CAAT.ActorContainer, cm.clone({
					location: /*new*/ cm.Point(this.width - this.x_offs, 10),
					anchor: CAAT.Actor.prototype.ANCHOR_TOP_RIGHT,
					image: {
						id: "meat"
					}
				}));
				this.addChild( this.meatImage );

				this.meatText = this.addAnchorText();
				this.meatText.setLocationAnchor(
						this.meatImage.x - 10,
						this.meatImage.y + this.meatImage.height/2,
						CAAT.Actor.prototype.ANCHOR_RIGHT );

				return this;
			},

            resetItems: function(){
                for(var i = 0; i < this.items.length; i++){
                    cm.dieActor(this.items[i]);
                }
                this.items = [];

                for(var i = 0; i < this.medals.length; i++){
                    cm.dieActor(this.medals[i]);
                }
                this.medals = [];
            },

            getItemImage: function(powerup){
                var id = powerup.desc.image.imageId;
                for(var i = 0; i < this.items.length; i++){
                    var item = this.items[i];
                    if(item.desc.image.id == id){
                        return item;
                    }
                }
                var y_offs;
                if(this.items.length > 0){
                    item = this.items[this.items.length-1];
                    y_offs = item.y + item.height + 5;
                }else{
                    y_offs = this.moneyImage.y + this.moneyImage.height + 117+50*2;
                }
                item = cm.playerData.itemsById[powerup.desc.itemId], params = null;
                if(item.typeId == cm.consts.ITEM_TYPE_WEAPON){
                    params = {
                        image: {
                            id: id,
                            size: [ 2, 1 ],
                            ms: 150,
                            animation: [0, 1]
                        }
                    };
                }else{
                    params = {
                        image: {id : id}
                    }
                }
                item = cm.createActor(this.level, CAAT.ActorContainer, cm.extend({
                    location: /*new*/ cm.Point(this.moneyImage.x + this.moneyImage.width/2, y_offs),
                    anchor: CAAT.Actor.prototype.ANCHOR_TOP
                    // image: { id: id }
                }, params));
                this.items.push(item);
                this.locateMedals(); // relocate medals
                this.addChild(item);
                return item;
            },

            locateMedals: function(){
                var y_offs, item;
                if(this.items.length > 0){
                    item = this.items[this.items.length-1];
                    y_offs = item.y + item.height + 17;
                }else{
                    y_offs = this.moneyImage.y + this.moneyImage.height + 117+50*2;
                }
                for(i = 0; i < this.medals.length; i++){
                    item = this.medals[i];
                    item.setLocation(item.x, y_offs);
                    y_offs += item.height + 5;
                }
            },

            getMedalImageByNum: function(num){
                for(var i = 0; i < this.medals.length; i++){
                    var medal = this.medals[i];
                    if(medal.desc.medalNum == num){
                        return medal;
                    }
                }
                var medalParams = cm.getMedalByNum(num);
                if(!medalParams){
                    return undefined;
                }
                medal = cm.createActor(this.level, CAAT.ActorContainer, cm.clone({
                    location: /*new*/ cm.Point(this.moneyImage.x + this.moneyImage.width/2, 0),
                    anchor: CAAT.Actor.prototype.ANCHOR_TOP,
                    medalNum: medalParams.medalNum,
                    image: {
                        id: medalParams.image.id
                    }
                }));
                this.medals.push(medal);
                this.medals.sort(function(a, b){
                    return a.desc.medalNum - b.desc.medalNum;
                });
                this.locateMedals();
                this.addChild(medal);
                return medal;
            },

			paintBar: function(director, x, y, width, height, t){
				var ctx = director.crc;

				if(t >= 0.7){
					cur = [ 0, 200, 0 ];
				}else if(t >= 0.35){
					cur = [ 200, 200, 0 ];
				}else{
					cur = [ 200, 0, 0 ];
				}

				ctx.fillStyle= "rgb("+cur[0]+","+cur[1]+","+cur[2]+")";
				ctx.beginPath();
				ctx.fillRect(x, y, width * t, height);
				ctx.fill();

				ctx.strokeStyle = "#000000";
				ctx.beginPath();
				ctx.strokeRect(x, y, width, height);
				ctx.stroke();
			},

			redArmorTime: 0,
			redHealthTime: 0,
			paint: function(director, time){
				cm.LevelHUD.superclass.paint.call(this, director, time);

				var playerHealth = cm.playerData.health * cm.playerData.effects.scale.playerHealth;
				var playerArmor = cm.playerData.armor * cm.playerData.effects.scale.playerArmor;

				var damaged = cm.playerData.armorDamaged - cm.playerData.armorRecovered + cm.playerData.armor * (1 - cm.playerData.effects.scale.playerArmor);
				var t = 1 - cm.clamp(damaged / cm.playerData.armor, 0, 1);
				this.paintBar(director, this.armor.x, this.armor.y + this.armor.height + 3, this.armor.width, 7, t);

				if(t >= 0.35){
					this.redArmorTime = 0;
					this.armor.alpha = 1;
				}else if(t > 0){
					if(this.redArmorTime && this.time - this.redArmorTime > 4000){
						this.armor.alpha = 1;
					}else{
						if(!this.redArmorTime){
							this.redArmorTime = this.time;
						}
						this.armor.alpha = cm.floor((this.time / 200) % 2) ? 1 : 0.5;
					}
				}else{
					this.redArmorTime = 0;
					this.armor.alpha = 0.5;
				}

				damaged = cm.playerData.healthDamaged - cm.playerData.healthRecovered + cm.playerData.health * (1 - cm.playerData.effects.scale.playerHealth);
				t = 1 - cm.clamp(damaged / cm.playerData.health, 0, 1);
				// cm.log('player health', playerHealth, damaged, t, cm.playerData, cm.playerData.health);
				this.paintBar(director, this.face.x, this.face.y + this.face.height + 3, this.face.width, 7, t);

				var oldFaceRow = this.faceRow;
				if(t >= 0.7){
					this.faceRow = 0;
				}else if(t >= 0.4){
					this.faceRow = 1;
				}else if(t >= 0.2){
					this.faceRow = 2;
				}else if(t > 0){
					this.faceRow = 3;
				}else{
					this.faceRow = 4;
				}
				if(oldFaceRow != this.faceRow){
					this.updateFaceFrame();
				}

				if(t >= 0.35){
					this.redHealthTime = 0;
					this.face.alpha = 1;
				}else if(t > 0){
					if(this.redHealthTime && this.time - this.redHealthTime > 4000){
						this.face.alpha = 1;
					}else{
						if(!this.redHealthTime){
							this.redHealthTime = this.time;
						}
						this.face.alpha = cm.floor((this.time / 200) % 2) ? 1 : 0.5;
					}
				}else{
					this.redHealthTime = 0;
					this.face.alpha = 0.5;
				}
			},

			faceState: 0,
			faceTime: 0,
			faceEndTime: 0,
			faceNextState: -1,
			faceNextTime: 0,
			faceNextDuration: 0,
			faceAlertTime: 0,

			setFaceState: function(state, duration){
				if(this.faceState != state && this.faceNextState != state){
					this.faceNextState = state;
					this.faceNextTime = this.time;
					this.faceNextDuration = duration;
				}
			},

			onHappy: function(){
				this.setFaceState(1, cm.randRange(2000, 5000));
			},
			onPain: function(){
				this.setFaceState(2, cm.randRange(1000, 3000));
			},
			onAlert: function(){
				if(this.time - this.faceAlertTime > 3000){
					this.faceAlertTime = this.time;
					this.setFaceState(cm.randItem([3, 4]), cm.randRange(1500, 2000));
				}
			},

			updateFaceFrame: function(){
				this.face.sprite.setAnimationImageIndex([this.faceState + this.faceRow*5]);
			},

			animate: function(director, time){
				if(this.faceNextState >= 0 && this.faceState != this.faceNextState
					&& (this.time - this.faceNextTime > (this.faceNextState ? 100 : 500)
						|| this.time > this.faceEndTime)){
					this.faceState = this.faceNextState;
					this.faceNextState = -1;
					this.faceEndTime = this.time + this.faceNextDuration;
					this.updateFaceFrame();
				}else if(this.faceNextState < 0 && this.time > this.faceEndTime){
					if(cm.rand() <= 0.7){
						this.setFaceState(cm.randItem([3, 4]), cm.randRange(700, 1500));
					}else{
						this.setFaceState(0, cm.randRange(2000, 5000));
					}
				}

				var moneyText = cm.round(cm.max(0, cm.playerData.moneySumCollected - cm.playerData.armorRecoverMoneyUsed));
                var moneyText2 = cm.round(cm.playerData.money);
                if(moneyText != moneyText2){
                    moneyText += "/"+moneyText2;
                }
				if(this.moneyCached != moneyText){
					this.moneyCached = moneyText;
					this.moneyText.setText( this.moneyCached );
				}
				var meatText = cm.round(cm.max(0, cm.playerData.meatSumCollected - cm.playerData.healthRecoverMeatUsed))
                var meatText2 = cm.round(cm.playerData.meat);
                if(meatText != meatText2){
                    meatText += "/"+meatText2;
                }
				if(this.meatCached != meatText){
					this.meatCached = meatText;
					this.meatText.setText( this.meatCached );
				}
				return cm.LevelHUD.superclass.animate.call(this, director, time);
			}
		};

		extend(cm.LevelHUD, CAAT.ActorContainer, null);
	})();

	(function(){
		cm.ItemsHelper = function(){
			cm.ItemsHelper.superclass.constructor.call(this);
			return this;
		};

		cm.ItemsHelper.prototype = {
			level: null,
			images: null,

			create: function(level){
				cm.ItemsHelper.superclass.create.call(this);

				this.level = level;
				this.setBounds( 0, 0, level.width, level.height );

				this.images = {enemy: [], item: []};
				for(var i = 0; i < 360; i += 45){
                    this.images.enemy.push(cm.director.getImage('red_'+i));
                    this.images.item.push(cm.director.getImage('green_'+i));
				}

				return this;
			},

            activeRect: {left:60, top:60, right:110, bottom:110},
			paintItems: function(canvas, images, positions){
                var pathItems = [];

                var activeRect = this.activeRect, pathLen, index;
                var ax = activeRect.left, ay = activeRect.top;
                var bx = this.width - activeRect.right;
                var by = this.height - activeRect.bottom;
                var clamp = cm.clamp;

                for(var i = positions.length-1; i >= 0; i--){
                    var pos = positions[i];
                    var y1 = (pos.y < ay)|0, y2 = (pos.y > by)|0;
                    var x1 = (pos.x < ax)|0, x2 = (pos.x > bx)|0;
                    switch(y1 | (y2<<1) | (x1<<2) | (x2<<3)){
                    case 0:
                        continue;

                    case (0 | (0<<1) | (0<<2) | (1<<3)):
                        pathLen = (bx - ax) + pos.y - ay;
                        index = 2;
                        break;

                    case (0 | (0<<1) | (1<<2) | (0<<3)):
                        pathLen = (bx - ax)*2 + (by - ay) + pos.y - ay;
                        index = 6;
                        break;

                    // case (0 | (0<<1) | (1<<2) | (1<<3)):
                    case (0 | (1<<1) | (0<<2) | (0<<3)):
                        pathLen = (bx - ax) + (by - ay) + bx - pos.x;
                        index = 4;
                        break;

                    case (0 | (1<<1) | (0<<2) | (1<<3)):
                        pathLen = (bx - ax) + (by - ay);
                        index = 3;
                        break;

                    case (0 | (1<<1) | (1<<2) | (0<<3)):
                        pathLen = (bx - ax)*2 + (by - ay);
                        index = 5;
                        break;

                    // case (0 | (1<<1) | (1<<2) | (1<<3)):
                    case (1 | (0<<1) | (0<<2) | (0<<3)):
                        pathLen = pos.x - ax;
                        index = 0;
                        break;

                    case (1 | (0<<1) | (0<<2) | (1<<3)):
                        pathLen = (bx - ax);
                        index = 1;
                        break;

                    case (1 | (0<<1) | (1<<2) | (0<<3)):
                        pathLen = (bx - ax)*2 + (by - ay)*2;
                        index = 7;
                        break;

                    // case (1 | (0<<1) | (1<<2) | (1<<3)):
                    // case (1 | (1<<1) | (0<<2) | (0<<3)):
                    // case (1 | (1<<1) | (0<<2) | (1<<3)):
                    // case (1 | (1<<1) | (1<<2) | (0<<3)):
                    // case (1 | (1<<1) | (1<<2) | (1<<3)):
                    }
                    // pathLen = pathLen|0;
                    var found = false;
                    for(var j = pathItems.length-1; j >= 0; j--){
                        var checkLen = pathItems[j];
                        if(pathLen+10 >= checkLen && pathLen-10 <= checkLen){
                            // console.log('pathLen found', pathLen, checkLen);
                            found = true;
                            break;
                        }
                    }
                    if(!found){
                        pathItems.push(pathLen);

                        var image = images[index];
                        var x = clamp(pos.x, ax, bx) - image.width/2;
                        var y = clamp(pos.y, ay, by) - image.height/2;

                        canvas.drawImage(image,
                            0, 0, image.width, image.height,
                            x, y, image.width, image.height);
                    }
                }
            },

            paint: function(director, time){
                cm.ItemsHelper.superclass.paint.call(this, director, time);

                var level = this.level, view = level.view, positions = [], item, i, x, y, pos;
                var list = level.layers[level.LAYER.MONSTERS].childrenList;
                for(i = list.length-1; i >= 0; i--){
                    if(!(item = list[i]).isMonsterVisible){
                        // positions.push( view.modelToView( cm.getActorCenter(item) ) );
                        // TODO: make optimized version here
                        // pos = cm.getActorCenter(item);
                        x = item.x + view.x + item.width/2;
                        y = item.y + view.y + item.height/2;
                        positions.push({x:x, y:y});
                    }
                }
                this.paintItems(director.crc, this.images.enemy, positions);

                positions = [];
                list = [].concat(level.layers[level.LAYER.MEDALS].childrenList,
                            level.layers[level.LAYER.GOLDS].childrenList);
                for(i = list.length-1; i >= 0; i--){
                    // pos = view.modelToView(cm.getActorCenter(list[i]));
                    // TODO: make optimized version here
                    // pos = cm.getActorCenter(item);
                    item = list[i];
                    x = item.x + view.x + item.width/2;
                    y = item.y + view.y + item.height/2;
                    pos = {x:x, y:y};
                    if(pos.x < 0 || pos.x > this.width
                        || pos.y < 0 || pos.y > this.height)
                    {
                        positions.push(pos);
                    }
                }
                this.paintItems(director.crc, this.images.item, positions);
            }
		};

		extend(cm.ItemsHelper, CAAT.Actor, null);
	})();

	(function(){
		cm.TilemapView = function(){
			cm.TilemapView.superclass.constructor.call(this);
			return this;
		};

		cm.TilemapView.prototype = {
			level: null,
			mapLayer: null,
			tilesets: null,
			tilesetImages: null, // CAAT.CompoundImage
			gidCache: {},

			create: function(level, mapLayer, tilesets){
				cm.TilemapView.superclass.create.call(this);

				this.level = level;
				this.mapLayer = mapLayer;
				this.tilesets = tilesets;
				this.tilesetImages = [];
				cm.each(tilesets, function(i, tileset){
					var image = cm.director.getImage(tileset['name']);
					if(!image){
						this.tilesetImages.push({
							firstgid: tileset['firstgid']
						});
                        // [begin debug]
						if(cm.logEnabled) cm.log("[tileset] ERR "+tileset['name']+" is not loaded");
                        // [end debug]
					}else{
						this.tilesetImages.push({
							firstgid: tileset['firstgid'],
							compoundImage: /*new*/ CAAT.CompoundImage().initialize( image, tileset['image']['height'] / tileset['tileheight'], tileset['image']['width'] / tileset['tilewidth'] )
						});
                        // [begin debug]
						if(cm.logEnabled) cm.log("[tileset] "+tileset['name']+" is loaded");
                        // [end debug]
					}
				});
				this.tilesetImages.sort(function(a, b){
					return b['firstgid'] - a['firstgid'];
				});
				if(this.tilesetImages.length > 1){
					// [begin debug]
                    if(cm.logEnabled) cm.log("[tileset] need reverse order "+this.tilesetImages[0].firstgid+" "+this.tilesetImages[1].firstgid);
                    // [end debug]
				}
				return this;
			},

			paint: function(director, time){
				// cm.TilemapView.superclass.paint.call(this, director, time);
				var canvas = director.crc;
				var mapSizeX = this.mapLayer.width;
				var mapSizeY = this.mapLayer.height;
				var map = this.mapLayer.map;
				var tilesetImages = this.tilesetImages;
				var gidCache = this.gidCache;
				var drawCellSizeX = this.level.cellSize.x;
				var drawCellSizeY = this.level.cellSize.y;
				// cm.log("[tilemap view] "+drawCellSizeX+" "+drawCellSizeY);
				for(var drawY = 0, y = 0; y < mapSizeY; y++, drawY += drawCellSizeY){
					for(var drawX = 0, x = 0; x < mapSizeX; x++, drawX += drawCellSizeX){
						if(map[x] !== undefined && map[x][y] !== undefined){
							var gid = map[x][y];
							if(gidCache[gid] === undefined){
								for(var i in tilesetImages){
									var image = tilesetImages[i];
									if(gid >= image.firstgid){
										gidCache[gid] = {
											compoundImage: image.compoundImage,
											index: gid - image.firstgid
										};
										break;
									}
								}
								if(gidCache[gid] === undefined){
									gidCache[gid] = {
									};
								}
							}
							var compoundImage = gidCache[gid].compoundImage;
							if(compoundImage !== undefined){
								/*
								cm.log("[tilemap] "+drawX+" "+drawY+" "+gidCache[gid].index
										+" "+compoundImage.getNumImages()
										+" "+compoundImage.singleWidth
										+" "+compoundImage.singleHeight
										);
								*/
								compoundImage.paintScaled(canvas, gidCache[gid].index, drawX, drawY, drawCellSizeX, drawCellSizeY);
								// compoundImage.paint(canvas, gidCache[gid].index, drawX, drawY);
							}
						}
					}
				}
			}
		};

		extend(cm.TilemapView, CAAT.Actor, null);
	})();

	(function(){

		cm.LevelMap = function(){
			return this;
		};

		cm.LevelMap.prototype = {
			data: {},
			cellSize: {x: 16, y: 16},
			tiledMap: null,

			activeArea: {min:{x:null, y:null}, max:{x:null, y:null}},
			extendActiveArea: function(x, y){
				if(this.activeArea.min.x === null || this.activeArea.min.x > x){
					this.activeArea.min.x = x;
				}
				if(this.activeArea.min.y === null || this.activeArea.min.y > y){
					this.activeArea.min.y = y;
				}
				if(this.activeArea.max.x === null || this.activeArea.max.x < x){
					this.activeArea.max.x = x;
				}
				if(this.activeArea.max.y === null || this.activeArea.max.y < y){
					this.activeArea.max.y = y;
				}
			},

			getXY: function(x, y, createCell){
				if(createCell !== undefined && !createCell){
					if(this.data[x] === undefined || this.data[x][y] === undefined){
						return undefined;
					}
				}

				if(this.data[x] === undefined){
					this.data[x] = {};
				}
				if(this.data[x][y] === undefined){
					this.data[x][y] = {};
					this.extendActiveArea(x, y);
				}
				return this.data[x][y];
			},

			setXY: function(x, y, cell){
				if(this.data[x] === undefined){
					this.data[x] = {};
				}
				if(this.data[x][y] === undefined){
					this.extendActiveArea(x, y);
				}
				this.data[x][y] = cell;
			},

			extendXY: function(x, y, cell, createCell){
				var ac = this.getXY(x, y, createCell);
				if(ac !== undefined){
					this.data[x][y] = cm.extend(ac, cell);
				}
			},

			extendRect: function(x, y, width, height, cell, createCell){
				for(var i = 0; i < width; i++){
					for(var j = 0; j < height; j++){
						this.extendXY(x+i, y+j, cell, createCell);
					}
				}
			},

			clearRect: function(x, y, width, height){
				for(var i = 0; i < width; i++){
					for(var j = 0; j < height; j++){
						if(this.data[x+i] !== undefined){ //  && this.data[x+i][y+j] !== undefined){
							// this.data[x+i][y+j] = undefined;
							delete this.data[x+i][y+j];
						}
					}
				}
			},

			setRect: function(x, y, width, height, cell){
				this.clearRect(x, y, width, height);
				this.extendRect(x, y, width, height, cell);
			},

			toLevelData: function(){
				var cellSize = this.cellSize;
				var levelData = [];
				for(var y = this.activeArea.min.y; y <= this.activeArea.max.y; y++){
					for(var x = this.activeArea.min.x; x <= this.activeArea.max.x; x++){
						var cell = this.getXY(x, y, false);
						if(cell === undefined || cell.parsed){
							continue;
						}
						// cm.log('[toLevelData] clone max');
						var max = cm.clone( this.activeArea.max );
						for(var ax = x+1; ax <= max.x; ax++){
							var ac = this.getXY(ax, y, false);
							if(ac !== undefined && !ac.parsed && ac.physics === undefined){
								// [begin debug]
                                if(cm.logEnabled) cm.log('getXY: '+x+','+y, ac);
                                // [end debug]
							}
							if(ac === undefined
									|| ac.parsed
									|| ac.physics.categoryBits != cell.physics.categoryBits){
								max.x = ax-1;
								break;
							}
						}
						for(var ay = y+1; ay <= max.y; ay++){
							var isOk = true;
							for(var ax = x; ax <= max.x; ax++){
								var ac = this.getXY(ax, ay, false);
								if(ac === undefined
										|| ac.parsed
										|| ac.physics.categoryBits != cell.physics.categoryBits){
									isOk = false;
									break;
								}
							}
							if(!isOk){
								max.y = ay-1;
								break;
							}
						}
						// cm.log('[toLevelData] clone cell');
						var block = cm.clone(cell);
						block.x = x * cellSize.x;
						block.y = y * cellSize.y;
						block.width = (max.x - x + 1) * cellSize.x;
						block.height = (max.y - y + 1) * cellSize.y;
						levelData.push(block);
						this.extendRect(x, y, max.x - x + 1, max.y - y + 1, {parsed: true}, false);
						// cm.log("[lvl-block] "+x+" "+y+" "+(max.x - x + 1)+" "+(max.y - y + 1));
					}
				}
				return levelData;
			}

		};

	})();

	(function(){

		cm.LevelScene = function(){
			cm.LevelScene.superclass.constructor.call(this);
			return this;
		};

		cm.LevelScene.prototype = {
			director: null,

			params: {
				level: null,
				invasion: null,
				day: null
			},

			physics: {
				world: null
			},

			LAYER: {
				__dummy__: cm.enumVal = 0,
				UNDER_FLOOR: cm.enumVal++,
				FLOOR: cm.enumVal++,
				MONSTER_SPAWN_AREA: cm.enumVal++,
				PLAYER_SPAWN_AREA: cm.enumVal++,
				FLOOR_DECALS: cm.enumVal++,
				WALLS: cm.enumVal++,
				PATH: cm.enumVal++,
				BLOOD: cm.enumVal++,
				GOLDS: cm.enumVal++,
				POWERUPS: cm.enumVal++,
				MONSTERS: cm.enumVal++,
				PLAYER: cm.enumVal++,
                MEDALS: cm.enumVal++,
				MONSTER_BULLETS: cm.enumVal++,
				EFFECTS: cm.enumVal++,
				PHYSICS_DEBUG: cm.enumVal++,
				COUNT: cm.enumVal
			},

			startTimeSec: 0,

			layers: [],
			view: null,
			viewScale: null,

			player: null,
			targetPointer: null,
			hud: null,

			create: function(director, tiledMap, dayParams, level, invasion, day, maxMedalNum){
				cm.LevelScene.superclass.create.call(this);

				this.startTimeSec = cm.getTimeMS() / 1000;
				this.director = director;
				this.params.level = level;
				this.params.invasion = invasion;
				this.params.day = day;
				var level = this;
				cm.level = this;

                cm.playerData.maxMedalNum = maxMedalNum;

				this.LAYER.PLAYER_DIE = this.LAYER.POWERUPS;

				this.setBounds( 0, 0, director.width, director.height );

                // [begin debug]
				if(cm.logEnabled) cm.log("[startupLevel]");
                // [end debug]

				var worldAABB = /*new*/ b2AABB();
				worldAABB.minVertex.Set(-1000, -1000);
				worldAABB.maxVertex.Set(director.width + 1000, director.height + 1000);
				var gravity = /*new*/ b2Vec2(0, 0);
				var doSleep = true;
				this.physics.world = /*new*/ b2World(worldAABB, gravity, doSleep);

				this.setFillStyle('#eeeeee');

				// this.viewScale = new CAAT.ActorContainer().create();
				// this.viewScale.setScale( 0.8, 0.8 );
				// this.addChild(this.viewScale);

				this.view = /*new*/ CAAT.ActorContainer().create();
				// this.view.setScale( 0.8, 0.8 );
				// this.view.setFrameTime( this.time, 100000000 );
				this.addChild(this.view);

				this.layers = /*new*/ Array( this.LAYER.COUNT );
				for(var i = 0; i < this.layers.length; i++){
					var layer = /*new*/ CAAT.ActorContainer().create();
					this.view.addChild(layer);
					this.layers[i] = layer;
				}

				this.hud = /*new*/ cm.LevelHUD().create(this);
				this.addChild(this.hud);

				/*
				var techText = new cm.AnchorText().create();
				// techText.setAlign("right");
				// techText.setBaseline("top");
				techText.setText( "Technical HTML5 demo" );
				techText.setFont( "18px sans-serif" );
				techText.setFillStyle( "black" );
				// techText.setOutline( true );
				techText.setOutlineColor( "white" );
				techText.setLocationAnchor( director.width-20, director.height-10, CAAT.Actor.prototype.ANCHOR_BOTTOM_RIGHT );
				// techText.setSize(10, 10, director.width-20, director.height-20);
				this.addChild(techText);
				*/

				this.targetPointer = /*new*/ cm.TargetPointer().create(this);
				this.addChild(this.targetPointer);

				var m = /*new*/ cm.MouseCapture().create(this);
				m.setBounds(0, 0, director.width, director.height);
				this.addChild(m);

				var cellSize = 16; // 20;
				var levelMap = this.initTiledMap( {x: cellSize, y: cellSize}, tiledMap );
				var levelData = levelMap.toLevelData(); // {x: cellSize, y: cellSize} );
				this.tiledMap = levelMap.tiledMap;
				this.cellSize = levelMap.cellSize;

				var minPos = /*new*/ cm.Point( 9999999, 9999999 );
				var maxPos = /*new*/ cm.Point( 0, 0 );
				for( var desc in levelData ){
					desc = levelData[desc];
					if(desc.physics === undefined){
						desc.physics = {};
					}
					if(desc.physics.density === undefined){
						desc.physics.density = 0;
					}
					if(desc.physics.restitution === undefined){
						// desc.physics.restitution = 0.5;
					}
					if((desc.physics.categoryBits & cm.physics.CAT_BIT_MONSTER_AREA) && cm.use_map_shape_debug){
						desc.fillStyle = "#aaa";
						desc.alpha = 0.5;
					}
					if(desc.physics.categoryBits === undefined){
						if(desc.physics.density == 0){
							desc.physics.categoryBits = cm.physics.CAT_BIT_STATIC;
						}else{
							desc.physics.categoryBits = cm.physics.CAT_BIT_ENVIRONMENT;
						}
					}
					if(desc.fillStyle === undefined && cm.use_map_shape_debug){
						desc.fillStyle = "#555";
						desc.alpha = 0.5;
					}
					// cm.log('[LevelScene.create] createActor');
					var obj = cm.createActor(this, CAAT.ActorContainer, cm.clone(desc));
					if(desc.physics.categoryBits & cm.physics.CAT_BIT_MONSTER_SPAWN){ // monsterSpawnArea){
						// cm.log("[create] spawn area: "+obj.x+" "+obj.y+" "+obj.width+" "+obj.height);
						this.layers[this.LAYER.MONSTER_SPAWN_AREA].addChild(obj);
					}else if(desc.physics.categoryBits & cm.physics.CAT_BIT_PLAYER_SPAWN){
						this.layers[this.LAYER.PLAYER_SPAWN_AREA].addChild(obj);
					}else if(desc.environment){
						this.layers[this.LAYER.FLOOR_DECALS].addChild(obj);
					}else{
						this.layers[this.LAYER.FLOOR].addChild(obj);
					}

					if(desc.physics.density == 0 && !desc.outside){
						minPos.x = cm.min(minPos.x, obj.x);
						minPos.y = cm.min(minPos.y, obj.y);
						maxPos.x = cm.max(maxPos.x, obj.x + obj.width);
						maxPos.y = cm.max(maxPos.y, obj.y + obj.height);
					}
				}
				this.view.setSize(maxPos.x, maxPos.y);
				this.view.startContentOffs = minPos;

                this.createPlayer();

				if(!cm.use_map_shape_debug){
					// this.layers[this.LAYER.FLOOR].addChild(new cm.TilemapView().create(this, this.tiledMap.floorLayer, this.tiledMap.tilesets));
					var levelImage = /*new*/ CAAT.ImageActor().create().setImage(cm.director.getImage('level-background'));
					var levelWidth = this.tiledMap.physics.layer.width * this.cellSize.x;
					var levelHeight = this.tiledMap.physics.layer.height * this.cellSize.y;
					levelImage.setScaleAnchored(levelWidth / levelImage.width, levelHeight / levelImage.height);
					this.layers[this.LAYER.FLOOR].addChild(levelImage);
				}

				if(0){
					// cm.log('[playerTiledMap] createActor');
					this.playerTiledMap = cm.createActor(this, CAAT.ActorContainer, cm.clone({
						center: cm.getActorCenter(this.player),
						radius: 5,
						fillStyle: "#55ff55"
					}));
					this.layers[this.LAYER.EFFECTS].addChild(this.playerTiledMap);
				}

                // [begin debug]
				if(cm.logEnabled) cm.log("[player] pos "+this.player.x+" "+this.player.y);
                // [end debug]

				this.activateItem(cm.playerData.defaultWeaponItem);
				this.activateItem(cm.playerData.armorItem);

                this.initItemsActivated();

				this.applyDayParams(dayParams);
				this.startPhase(0);

				if(cm.use_physics_debug){
					var debugLayer = /*new*/ CAAT.Actor().create();
					debugLayer.paint = function(director, time){
						// cm.LevelScene.superclass.paint.call(this, director, time);
						cm.physics.drawWorld(level.physics.world, director.ctx);

						if(level.player){
							var pos = cm.getActorCenter(level.player);
							cm.physics.drawCircle(director.ctx, '#ff5050', pos, level.monsterIdleMaxDist);
							cm.physics.drawCircle(director.ctx, '#ffa0a0', pos, level.monsterIdleMinDist);
						}
					};
					this.layers[this.LAYER.PHYSICS_DEBUG].addChild(debugLayer);
				}

				return this;
			},

            createPlayer: function(pos){
                if(pos === undefined){
                    pos = cm.randAreaPos( cm.randItem( this.layers[this.LAYER.PLAYER_SPAWN_AREA].childrenList ) );
                }
				this.player = /*new*/ cm.Player().create(this, {
					center: pos
				});
				this.layers[this.LAYER.PLAYER].addChild(this.player);
            },

            renewPlayer: function(){
                var pos;
                if(this.player){
                    pos = cm.getActorCenter(this.player);
                }
                cm.deleteActor(this.player);

                cm.playerData.healthDamaged = 0;
                cm.playerData.armorDamaged = 0;
                cm.playerData.damagedTime = 0;

                var list = this.layers[this.LAYER.MONSTERS].childrenList;
                for(var i = 0; i < list.length; i++){
                    // cm.dieActor(list[i]);
                    var monster = list[i];
                    if(monster.moveMonster){
                        monster.target = null;
                        monster.path = false;
                    }
                }
                // this.wave.phaseMonstersSpawned -= list.length;

                this.createPlayer(pos);
            },

			onEnemyKilled: function(enemyActor){
				var id = enemyActor.desc.itemId;
				if(!cm.playerData.killedCountById[id]){
					cm.playerData.killedCountById[id] = 1;
				}else{
					cm.playerData.killedCountById[id]++;
				}
                if(this.player && this.player.onEnemyKilled){
        			this.hud.onHappy();
                    this.player.onEnemyKilled(enemyActor);
                }
			},

			onMedalCollected: function(actor){
				var id = actor.desc.itemId;
				if(!cm.playerData.medalsCollectedCountById[id]){
					cm.playerData.medalsCollectedCountById[id] = 1;
				}else{
					cm.playerData.medalsCollectedCountById[id]++;
				}
			},

			onItemCollected: function(actor){
				var id = actor.desc.itemId;
				if(!cm.playerData.itemsCollectedCountById[id]){
					cm.playerData.itemsCollectedCountById[id] = 1;
				}else{
					cm.playerData.itemsCollectedCountById[id]++;
				}
			},

			getItemRemainPercentage: function(id){
				var item = cm.playerData.activeItems[id];
				if(item){
					if(item.durationMS <= 0){
						return 100;
					}
					var t = item.remainMS / item.durationMS;
					return cm.clamp(t * 100, 1, 100);
				}
				return 0;
			},

			activateItem: function(item, play_sound, remainMS){
                // console.log('activateItem', item, cm.playerData.defaultWeaponItem, cm.playerData.activeWeapons);
				if(item != cm.playerData.defaultWeaponItem && item != cm.playerData.armorItem){
					if(!cm.playerData.usedCountById[item.id]){
						cm.playerData.usedCountById[item.id] = 1;
					}else{
						cm.playerData.usedCountById[item.id]++;
					}
				}

				delete cm.playerData.activeItems[item.id];
				item.remainMS = remainMS !== undefined ? remainMS : item.durationMS;
				cm.playerData.activeItems[item.id] = item;
				cm.playerData.activeChanged = true;

				if(item.typeId == cm.consts.ITEM_TYPE_ARTEFACT){
					cm.playerData.activeArtefacts[item.id] = item;

                    cm.playerData.armorDamaged = cm.max(0,
                        cm.playerData.armorDamaged - cm.max(0,
                            cm.playerData.armor * item.player_armor_p * 0.01));
                    cm.playerData.healthDamaged = cm.max(0,
                        cm.playerData.healthDamaged - cm.max(0,
                            cm.playerData.health * item.player_health_p * 0.01));
				}else if(item.typeId == cm.consts.ITEM_TYPE_WEAPON){
					if(1){ // make only one active weapon
						for(var id in cm.playerData.activeWeapons){
							delete cm.playerData.activeItems[id];
						};
						cm.playerData.activeWeapons = {};
					}
					cm.playerData.activeWeapons[item.id] = item;
				}else if(item.typeId == cm.consts.ITEM_TYPE_ARMOR){
					cm.playerData.activeArmors[item.id] = item;
				}

				if(play_sound && !cm.paused){
					// TODO: play sound
				}
                // [begin debug]
				if(cm.logEnabled) cm.log('item activated', item.nameId, item);
                // [end debug]
				// var test = null; test.test = 0;
                cm.callbacks['itemActivated'](item.id, item.remainMS, remainMS !== undefined);
			},

            initItemsActivated: function(){
                for(var item_id in cm.playerData.itemsById){
                    var item = cm.playerData.itemsById[item_id];
                    if(item.remainMS > 0){
                        cm.callbacks['itemActivated'](item.id, item.remainMS, true);
                        // this.activateItem(item, false, item.remainMS);
                    }
                }
            },

			updateActivatedItems: function(){
				var self = this, time = this.time;
				var playerData = cm.playerData;
				var items = playerData.activeItems;
                var curMonsters = this.layers[this.LAYER.MONSTERS].childrenList.length;
				var i, deltaTimeMS = curMonsters > 0 ? this.deltaTimeSec * 1000 : 0;
				for(i in items){
					var item = items[i];
					if(item.durationMS > 0 && (item.remainMS -= deltaTimeMS) <= 0){
						item.remainMS = 0;
						delete items[i];
						delete playerData.activeArtefacts[i];
						delete playerData.activeWeapons[i];
						delete playerData.activeArmors[i];
						playerData.activeChanged = true;
						// [begin debug]
                        if(cm.logEnabled) cm.log('item deactivated', item.nameId);
                        // [end debug]
                        cm.callbacks['itemDeactivated'](item.id);

						(function(){
							for(var id in playerData.activeWeapons){
								return;
							}
							self.activateItem(cm.playerData.defaultWeaponItem);
                            cm.callbacks['defaultWeaponActivated'](cm.playerData.defaultWeaponItem.id);
						})();

						(function(){
							for(var id in playerData.activeArmors){
								return;
							}
							self.activateItem(cm.playerData.armorItem);
						})();
					}
				}
				if(!playerData.activeChanged){
					return;
				}
				playerData.activeChanged = false;

				var effects = playerData.effects;
				var oldMonsterHealthScale = effects.scale.monsterHealth;
				for(i in effects.scale){
					effects.scale[i] = 1.0;
				}
				// cm.log('effects #1', effects);

                for(j = 0; j < 2; j++){
                    var artefacts = j == 0 ? playerData.activeArtefacts : playerData.activeArmors;
                    for(i in artefacts){
                        var artefact = artefacts[i];
                        // cm.log('artefact effects', artefact);

                        effects.scale.weaponDamage += artefact.weapon_damage_p * 0.01;
                        effects.scale.weaponFrequency += artefact.weapon_frequency_p * 0.01;
                        effects.scale.weaponSpeed += artefact.weapon_speed_p * 0.01;
                        effects.scale.weaponDensity += artefact.weapon_density_p * 0.01;
                        effects.scale.playerArmor += artefact.player_armor_p * 0.01;
                        effects.scale.playerHealth += artefact.player_health_p * 0.01;
                        effects.scale.playerSpeed += artefact.player_speed_p * 0.01;
                        effects.scale.monsterHealth += artefact.monster_health_p * 0.01;
                        effects.scale.monsterSpeed += artefact.monster_speed_p * 0.01;

                        // effects.weapon_fire_type = max(effects.weapon_fire_type, artefact.weapon_fire_type);
                        effects.weaponFireType = artefact.weapon_fire_type;

                        // cm.log('effects ...', effects);
                    }
                }

				for(i in effects.scale){
					if(effects.scale[i] < 0.005){
						effects.scale[i] = 0.005;
					}
				}

				if(oldMonsterHealthScale != effects.scale.monsterHealth){
					cm.each(this.layers[this.LAYER.MONSTERS].childrenList, function(i, monster){
						monster.damagedTime = monster.time;
					});
				}
                // [begin debug]
				if(cm.logEnabled) cm.log('effects updated', effects);
                // [end debug]
				// TODO: set selected weapon & armor
			},

			excludedSpawnAreas: [],
			findBestSpawnArea: function(pos){
				if(pos === undefined){
					pos = cm.getActorCenter(this.player);
				}
				// cm.log("[findBestSpawnArea] pos "+pos.x+" "+pos.y);
				var bestSpawnArea = null;
				var bestDist = 999999999, bestNum = -1;
				var list = this.layers[this.LAYER.MONSTER_SPAWN_AREA].childrenList;
				var count = list.length;
				var maxExcludedCount = cm.ceil(cm.min(count-1, cm.max(2, this.params.day/5.0 + this.params.invasion-1)));
				while(this.excludedSpawnAreas.length > maxExcludedCount){
					this.excludedSpawnAreas.shift();
				}
				var excludedCount = this.excludedSpawnAreas.length;
				for(var i = 0; i < count; i++){
					var area = list[i];

					var isExcludedArea = false;
					for(var j = 0; j < excludedCount; j++){
						if(area == this.excludedSpawnAreas[j]){
							isExcludedArea = true;
							break;
						}
					}
					if(isExcludedArea){
						continue;
					}

					var points = [
								  cm.getActorCenter(area)
								  /*
								  new cm.Point(area.x, area.y),
								  new cm.Point(area.x + area.width, area.y),
								  new cm.Point(area.x, area.y + area.height),
								  new cm.Point(area.x + area.width, area.y + area.height)
								  */
								  ];
					for(var j = 0; j < points.length; j++){
						var p = points[j];
						p = p.subtract(pos);
						// cm.log("[findBestSpawnArea] pos: "+pos.x+" "+pos.y);
						var dist = p.x*p.x + p.y*p.y;
						if(bestDist > dist){
							bestDist = dist;
							bestNum = i;
							bestSpawnArea = area;
						}
						// cm.log("[findBestSpawnArea] i "+i+", p: "+p.x+" "+p.y+", dist "+dist+", best "+bestNum+", dist "+bestDist);
					}
				}
                // [begin debug]
				if(cm.logEnabled) cm.log("[findBestSpawnArea] areas "+list.length+", best "+bestNum+", dist "+bestDist);
                // [end debug]
				this.excludedSpawnAreas.push(bestSpawnArea);
				return bestSpawnArea;
			},

			monsterSide: 0,
			spawnMonster: function(params, spawnArea){
				if(spawnArea === undefined){
					spawnArea = this.findBestSpawnArea();
				}
				this.monsterSide = (this.monsterSide + 1) % 2;
				var m = /*new*/ cm.Monster().create(this, cm.extend({
					center: cm.randAreaPos(spawnArea, -10),
					battleSide: cm.use_monsters_battle ? this.monsterSide : false
				}, params));
				/*
				cm.log("[spawnMonster] xy: "+x+" "+y
						+", m-xy:"+m.x+" "+m.y
						+", "+spawnArea.x+" "+spawnArea.y+" "+spawnArea.width+" "+spawnArea.height);
				*/
				this.layers[this.LAYER.MONSTERS].addChild(m);
			},

			spawnItem: function(params, spawnArea){
				if(spawnArea === undefined){
					spawnArea = this.findBestSpawnArea();
				}
                var m = /*new*/ cm.Item().create(this, {
                    itemId: params.itemId,
					center: cm.randAreaPos(spawnArea, -10),
                    image: {
                        id: params.image.id
                    }
				});
				this.layers[this.LAYER.MEDALS].addChild(m);
			},

			bloodUsedList: [],
			createBlood: function(actor, count, activeFrames, params){
				var dt = 300; // actor == this.player ? 300 : 300;
				for(var i = this.bloodUsedList.length-1; i >= 0; i--){
					var item = this.bloodUsedList[i];
					if(this.time - item.time > dt){
						this.bloodUsedList.splice(i, 1);
						continue;
					}
					if(item.actor == actor){
						return;
					}
				}
				this.bloodUsedList.push({time: this.time, actor: actor});

				var pos = cm.getActorCenter(actor);
				if(activeFrames === undefined){
					activeFrames = [
						0, 1, 2, 3,
						4, 5, 6, 7,
						8, 9, 10, 11,
						12, 13, 14, 15];
				}
				for(var i = 0; i < count; i++){
					var blood = /*new*/ cm.Blood().create(this, cm.extend({
						center: pos,
						image: {
							// id: "blood",
							animation: [ cm.randItem(activeFrames) ]
						}
					}, params));
					this.layers[this.LAYER.BLOOD].addChild( blood );
				}
				var list = this.layers[this.LAYER.BLOOD].childrenList;
				var count = list.length, maxCount = 150;
				for(i = count - maxCount - 1; i >= 0; i--){
					cm.deleteActor(list[i]);
				}
			},

			aimData: function(){
				var playerPos = cm.getActorCenter(this.player);
				// var targetPos = this.view.viewToModel( cm.getActorCenter(this.targetPointer) );
				var targetPos = cm.getActorCenter(this.targetPointer);
				targetPos.x -= this.view.x;
				targetPos.y -= this.view.y;
				var targetDir =	targetPos.clone().subtract( playerPos ).normalize();
				return {
					playerPos: playerPos,
					targetPos: targetPos,
					targetDir: targetDir
				};
			},

			mouseMove: function(mouseEvent){
				cm.LevelScene.superclass.mouseMove.call(this, mouseEvent);

				// var actor = mouseEvent.source;
                // [begin debug]
				if(cm.logEnabled) cm.log( "[SCENE]"
						+ " P: " + cm.round(mouseEvent.point.x) + " " + cm.round(mouseEvent.point.y)
						+ " S: " + cm.round(mouseEvent.screenPoint.x) + " " + cm.round(mouseEvent.screenPoint.y)
						// + ", A: " + cm.round(actor.x) + " " + cm.round(actor.y)
						);
                // [end debug]
				// this.targetPointer.x = cm.round(mouseEvent.point.x);
				// this.targetPointer.y = cm.round(mouseEvent.point.y - this.targetPointer.height / 2);

				// this.player.x = cm.round(mouseEvent.point.x - this.targetPointer.width / 2);
				// this.player.y = cm.round(mouseEvent.point.y - this.targetPointer.height / 2);
				// cm.physics.applyActorToPhysicsBody(this.player);

				// this.targetPointer.setLocation(
				//		mouseEvent.point.x - this.targetPointer.width / 2,
				//		mouseEvent.point.y - this.targetPointer.height / 2
				//		);
			},

			updateCamera: function(){
				if( !this.player ){
					return;
				}

				var playerPos = cm.getActorCenter(this.player); // new cm.Point( this.player.x, this.player.y );
				var center = /*new*/ cm.Point( this.width / 2, this.height / 2 );
				var idealPos = center.clone().subtract( playerPos );
				var pos = /*new*/ cm.Point( this.view.x, this.view.y );
				var move = cm.roundPoint( idealPos.clone().subtract( pos ).multiply( this.deltaTimeSec / 0.6 ) );

				pos.translatePoint( move );
				// pos = cm.roundPoint(pos);

				var maxOffs = cm.round(this.width * 0.05);
				if(idealPos.x - pos.x > maxOffs){
					pos.x = idealPos.x - maxOffs;
				}else if(idealPos.x - pos.x < -maxOffs){
					pos.x = idealPos.x + maxOffs;
				}
				if(idealPos.y - pos.y > maxOffs){
					pos.y = idealPos.y - maxOffs;
				}else if(idealPos.y - pos.y < -maxOffs){
					pos.y = idealPos.y + maxOffs;
				}

				if(this.view.width <= this.width){
					pos.x = (this.width - this.view.width) / 2;
				}else
				if(pos.x > -this.view.startContentOffs.x){
					pos.x = -this.view.startContentOffs.x;
				}else if(pos.x + this.view.width < this.width){
					pos.x = this.width - this.view.width;
				}
				if(this.view.height <= this.height){
					pos.y = (this.height - this.view.height) / 2;
				}else
				if(pos.y > -this.view.startContentOffs.y){
					pos.y = -this.view.startContentOffs.y;
				}else if(pos.y + this.view.height < this.height){
					pos.y = this.height - this.view.height;
				}

				pos.x = cm.round(pos.x); // * this.view.scaleX);
				pos.y = cm.round(pos.y); // * this.view.scaleY);

				// cm.log("[pos] "+cm.round(pos.x)+" "+cm.round(pos.y)+" "+cm.round(pos.x + this.view.width)+" "+this.width);
				this.view.setLocation( pos.x, pos.y );
			},

			oldTimeMS: 0, // new Date().getTime(),
			// deltaTimeMS: 0,
			deltaTimeSec: 0,
			accumTimeSec: 0,
			monsterFireTime: 0,

			endAnimate: function(director, time){
				return cm.LevelScene.superclass.endAnimate.call(this, director, time);
			},

			wave: {
				time: 0,
				num: 0,
				phase: 0,
				maxAliveMonsters: 0,
				completed: false,
				params: null,
				phaseParams: null,
				phaseMonsters: 0,
				phaseMonstersSpawned: 0
			},

			startPhase: function(phase, maxAliveMonsters){
				this.wave.time = this.time;
				this.wave.phase = phase;
				this.wave.completed = false;
				this.wave.phaseParams = this.wave.params.phases[ phase % this.wave.params.phases.length ];
				this.wave.maxAliveMonsters = cm.round(cm.param(maxAliveMonsters, this.wave.phaseParams.maxAliveMonsters, this.wave.params.maxAliveMonsters, 10));
				this.wave.phaseMonsters = cm.round(cm.param(this.wave.phaseParams.count, 1));
				this.wave.phaseMonstersSpawned = 0;

				if(phase == 0){
					cm.playerData.startTimeSec = cm.getTimeMS() / 1000;
					cm.playerData.playTimeSec = 0;

                    if(this.player){
                        this.player.protectionEndTimeSec = 0;
                    }

                    /*
					cm.playerData.killedCountById = {};
                    cm.playerData.medalsCollectedCountById = {};
					cm.playerData.itemsCollectedCountById = {};
					cm.playerData.usedCountById = {};
                    */

					cm.playerData.healthDamaged = cm.max(0, cm.playerData.healthDamaged - cm.playerData.healthRecovered);
					cm.playerData.healthRecovered = 0;

					cm.playerData.armorDamaged = cm.max(0, cm.playerData.armorDamaged - cm.playerData.armorRecovered);
					cm.playerData.armorRecovered = 0;

                    cm.playerData.meat = cm.max(0, cm.playerData.meat - cm.playerData.meatSent);
                    cm.playerData.meatSent = 0;
					cm.playerData.meatSumCollected = cm.max(0, cm.round(cm.playerData.meatSumCollected - cm.playerData.healthRecoverMeatUsed));
					cm.playerData.healthRecoverMeatUsed = 0;

                    cm.playerData.money = cm.max(0, cm.playerData.money - cm.playerData.moneySent);
                    cm.playerData.moneySent = 0;
					cm.playerData.moneySumCollected = cm.max(0, cm.round(cm.playerData.moneySumCollected - cm.playerData.armorRecoverMoneyUsed));
					cm.playerData.armorRecoverMoneyUsed = 0;

					// cm.playerData.moneySent = cm.min(cm.playerData.moneySent, cm.playerData.money);
					// cm.playerData.meatSent = cm.min(cm.playerData.meatSent, cm.playerData.meat);

					cm.callbacks['dayStarted'](this.params.level, this.params.invasion, this.params.day);
				}

				this.spawnWaveMonsters();
			},

			applyDayParams: function(dayParams){
				// if(!dayParams) dayParams = {};
                // console.log('dayParams', dayParams);

				var params = this.wave.params = {}; // this.waveParams[0];

				params.meatPerHealth = cm.max(1, cm.param(dayParams['meat_per_health'], 1));
				params.moneyPerArmor = cm.max(1, cm.param(dayParams['money_per_armor'], 1));
				params.maxAliveMonsters =  dayParams['max_alive_monsters'];
				params.monsterFireMaxBullets =  dayParams['monster_fire_max_bullets'];
				params.monsterFireMinDistance =  dayParams['monster_fire_min_distance'];
				params.monsterFireIntervalSec =  dayParams['monster_fire_interval_sec'];
				params.monsterFireFrequencyScale =  dayParams['monster_fire_frequency_scale'];
				params.monsterFireDamageScale =  dayParams['monster_fire_damage_scale'];
				params.monsterFireBulletSpeedScale =  dayParams['monster_fire_bullet_speed_scale'];
				params.monsterFireBulletDensityScale =  dayParams['monster_fire_bullet_density_scale'];
				params.monsterSpeedScale =  dayParams['monster_speed_scale'];
				params.monsterHealthScale =  dayParams['monster_health_scale'];
				params.monsterAimOnDamage = dayParams['monster_aim_on_damage'];

				params.phases = [];
				cm.each(dayParams['phases'], function(i, dayPhase){
					var phase = {};

					phase.count = dayPhase['count'];
					phase.maxAliveMonsters = dayPhase['max_alive_monsters'];

					if(dayPhase['next']){
						phase.next = {
							delaySec: dayPhase['next']['delay_sec'],
							aliveMonsters: dayPhase['next']['alive_monsters']
						};
					}

					if($.isArray(dayPhase['monster'])){
						phase.monster = [];
						cm.each(dayPhase['monster'], function(i, name){
							phase.monster.push(cm.getMonsterByName(name));
						});
					}else if(dayPhase['monster']){
						phase.monster = cm.getMonsterByName(dayPhase['monster']);
                    }

                    if(dayPhase['item']){
                        phase.item = cm.getItemByName(dayPhase['item']);

                    }

					params.phases.push(phase);
				});
                // [begin debug]
				if(cm.logEnabled) cm.log('day params ', params, dayParams);
                // [end debug]
			},

			loadingDayParams: false,
			loadDayParams: function(callback){
				var self = this;
				if(!self.loadingDayParams){
                    self.loadingDayParams = true;
                    cm.callbacks['showLoader']();
                    cm.ajaxCrypt(cm.urls['loadDayParams'], {
                        'level': self.params.level,
                        'invasion': self.params.invasion,
                        'day': self.params.day
                    }, function(data){
                        self.loadingDayParams = false;
                        cm.playerData.maxMedalNum = data['max_medal_num'];
                        // [begin debug]
                        if(cm.logEnabled) cm.log('maxMedalNum', cm.playerData.maxMedalNum);
                        // [end debug]
                        // this.waveParams = [ this.waveParams[0] ];
                        // this.waveParams[0].phrases = [];
                        self.applyDayParams(data['day_params']);
                        cm.callbacks['hideLoader']();
                        callback();
                    }, function(){
                        // error handler
                        self.loadingDayParams = false;
                        cm.callbacks['hideLoader']();
                    });
                }
			},

			getDayResult: function(){
				var curTimeSec = cm.getTimeMS() / 1000;
				var result = {
					'days_completed': cm.playerData.daysCompleted,
					'without_pause_day_time_sec': cm.round(cm.playerData.playTimeSec),
					'day_time_sec': cm.round(curTimeSec - cm.playerData.startTimeSec),
					'invasion_time_sec': cm.round(curTimeSec - this.startTimeSec),
					// 'money': cm.round(cm.max(0, cm.playerData.money - cm.playerData.moneySent - cm.playerData.armorRecoverMoneyUsed)),
					// 'meat': cm.round(cm.max(0, cm.playerData.meat - cm.playerData.meatSent - cm.playerData.healthRecoverMeatUsed)),
					// not used 'money': cm.round(cm.max(0, cm.playerData.money - cm.max(0, cm.playerData.armorRecoverMoneyUsed - cm.playerData.moneySumCollected))),
					// not used 'meat': cm.round(cm.max(0, cm.playerData.meat - cm.max(0, cm.playerData.healthRecoverMeatUsed - cm.playerData.meatSumCollected))),
					'money': cm.round(cm.playerData.money),
					'meat': cm.round(cm.playerData.meat),
					'all_killed': 0,
					'killed': {},
                    'medals_collected': {},
					'items_collected': {},
					'used': {},
                    'activated': {},
					'player': {
						'health': cm.round(cm.playerData.health - cm.playerData.healthDamaged + cm.playerData.healthRecovered),
						'health_damaged': cm.round(cm.playerData.healthDamaged),
						'health_recovered': cm.round(cm.playerData.healthRecovered),
						'health_recover_meat_used': cm.round(cm.playerData.healthRecoverMeatUsed),
						'max_health': cm.round(cm.playerData.health),
						'armor': cm.round(cm.playerData.armor - cm.playerData.armorDamaged + cm.playerData.armorRecovered),
						'armor_damaged': cm.round(cm.playerData.armorDamaged),
						'armor_recovered': cm.round(cm.playerData.armorRecovered),
						'armor_recover_money_used': cm.round(cm.playerData.armorRecoverMoneyUsed),
						'max_armor': cm.round(cm.playerData.armor)
					},
					'version': '0.9'
				};
				cm.each(cm.playerData.killedCountById, function(id, count){
					result['all_killed'] += count;
					result['killed'][id] = {
							'name_id': cm.playerData.itemsById[id].nameId,
							'count': count
						};
				});
                // [begin debug]
                if(cm.logEnabled) cm.log('medalsCollected', cm.playerData.medalsCollectedCountById);
                // [end debug]
				cm.each(cm.playerData.medalsCollectedCountById, function(id, count){
					result['medals_collected'][id] = {
							'name_id': cm.playerData.itemsById[id].nameId,
							'count': count
						};
				});
                // [begin debug]
                if(cm.logEnabled) cm.log('itemsCollected', cm.playerData.itemsCollectedCountById);
                // [end debug]
				cm.each(cm.playerData.itemsCollectedCountById, function(id, count){
					result['items_collected'][id] = {
							'name_id': cm.playerData.itemsById[id].nameId,
							'count': count
						};
				});
                // [begin debug]
                if(cm.logEnabled) cm.log('usedItems', cm.playerData.usedCountById);
                // [end debug]
				cm.each(cm.playerData.usedCountById, function(id, count){
					result['used'][id] = {
							'name_id': cm.playerData.itemsById[id].nameId,
							'count': count
						};
				});
                // [begin debug]
                if(cm.logEnabled) cm.log('activeItems', cm.playerData.itemsById);
                // [end debug]
				cm.each(cm.playerData.itemsById, function(id, item){
                    if(item.remainMS > 0){
                        result['activated'][id] = {
                                'name_id': item.nameId,
                                'remain_ms': Math.ceil(item.remainMS)
                            };
                    }
                });

				return result;
			},

			animRecover: function(imageId, srcActor, destActor, p2, p3, callback){
				var destCenter = cm.getActorCenter(destActor);
				var center = cm.getActorCenter(srcActor);
				var delayTime = cm.randRange(0, 500);
				var pathDuration = cm.randRange(1500, 2000);
				// cm.log('[onMoneyTouched] createActor');
				var animActor = cm.createActor(this, CAAT.ActorContainer, cm.clone({
					center: center,
					image: {id: imageId},
					angle: 0,
					life: {
						behaviors: [
							{
								start: delayTime,
								duration: pathDuration,
								interpolator: {
									type: "exp_in_out",
									exp: 3
								},
								path: {
									anchor: CAAT.Actor.prototype.ANCHOR_CENTER,
									cubic: [ null, p2, p3, destCenter ]
									/* quadric: [ null,
											   { x: this.width/2, y: this.height/2 },
											   destCenter ] */
								}
							},
							{
								start: delayTime+pathDuration-700,
								duration: 400,
								alpha: [1, 0]
							}
						]
					}
				}));
				animActor.onDestroy = function(){
					// cm.log('animActor.onDestroy');
					callback();
				};
				this.hud.addChild( animActor );
			},

			recoverPlayer: function(callback){
				var self = this,
					meatPerHealth = this.wave.params.meatPerHealth,
					moneyPerArmor = this.wave.params.moneyPerArmor,
					healthToRecover = cm.min(cm.playerData.healthDamaged, cm.playerData.meatSumCollected / meatPerHealth),
					armorToRecover = cm.min(cm.playerData.armorDamaged, cm.playerData.moneySumCollected / moneyPerArmor);

				function animMeat(count, maxStepCount, dt){
					var stepCount = cm.min(maxStepCount, count), first = true;
					for(var i = 0; i < stepCount; i++){
						self.animRecover("meat", self.hud.meatImage, self.hud.face,
								// { x: self.width*0.1, y: self.height*0.1 },
								// { x: self.width*0.1, y: self.height*0.9 },
								{x: self.width*1.0, y: self.height*0.3},
								{x: self.width*0.1, y: self.height*0.4},
								function(){
									if(first){
										self.player.onHappy();
										self.hud.onHappy();
										first = false;
									}
									cm.playerData.healthRecovered++;
									cm.playerData.healthRecoverMeatUsed += meatPerHealth;
									if(--count <= 0 && callback){
										// cm.playerData.meat = cm.round(cm.playerData.meat);
										callback();
										callback = undefined;
									}
									// checkFinished();
								}
							);
					}
					if( (count - stepCount) > 0){
						setTimeout(function(){animMeat(count - stepCount, maxStepCount, dt, callback);}, dt);
					}
				};

				function animMoney(count, maxStepCount, dt, callback){
					var stepCount = cm.min(maxStepCount, count), first = true;
					for(var i = 0; i < stepCount; i++){
						self.animRecover("money", self.hud.moneyImage, self.hud.armor,
								{x: self.width*0.0, y: self.height*1.0},
								{x: self.width*0.9, y: self.height*-0.7},
								function(){
									if(first){
										self.player.onHappy();
										self.hud.onHappy();
										first = false;
									}
									cm.playerData.armorRecovered++;
									cm.playerData.armorRecoverMoneyUsed += moneyPerArmor;
									if(--count <= 0 && callback){
										// cm.playerData.money = cm.round(cm.playerData.money);
										callback();
										callback = undefined;
									}
									// checkFinished();
								}
							);
					}
					if( (count - stepCount) > 0){
						setTimeout(function(){animMoney(count - stepCount, maxStepCount, dt, callback);}, dt);
					}
				};

				function runAnim(func, count, callback){
					if(count > 0){
						var maxSteps = 20.0, dt = 300, maxTime = cm.clamp(5000 * count / 100, 1000, 5000);
						var steps = cm.min(count, maxSteps);
						if(dt * steps > maxTime){
							dt = maxTime / steps;
						}
						func(count, cm.ceil(count / steps), dt, callback);
						// cm.log('runAnim', count, count / steps, dt, func)
					}else{
						callback();
					}
				};

				runAnim(animMoney, armorToRecover, function(){
					runAnim(animMeat, healthToRecover, function(){
						if(armorToRecover > 0 || healthToRecover > 0){
							self.player.onHappy();
							self.hud.onHappy();
						}
						callback();
					});
				});
			},

			waveCompletedInProgress: false,
			onWaveCompleted: function(){
				var self = this;
				if(!self.waveCompletedInProgress){
					self.waveCompletedInProgress = true;
					setTimeout(function(){
						self.recoverPlayer(function(){
							cm.callbacks['showLoader']();

							cm.playerData.daysCompleted++;
							var dayResult = self.getDayResult();
                            var dayResultData = {
								'level': self.params.level,
								'invasion': self.params.invasion,
								'day': self.params.day,
								'json_data': $.JSON.encode(dayResult)
							};
							cm.playerData.moneySent = dayResult['money'];
							cm.playerData.meatSent = dayResult['meat'];
							cm.ajaxCrypt(cm.urls['saveDayResult'], dayResultData,
								function(data){
                                    for(var id in cm.playerData.itemsCollectedCountById){
                                        var count = cm.playerData.itemsCollectedCountById[id];
                                        cm.playerData.itemsById[id].count += count;
                                    }

                                    cm.playerData.killedCountById = {};
                                    cm.playerData.medalsCollectedCountById = {};
                                    cm.playerData.itemsCollectedCountById = {};
                                    cm.playerData.usedCountById = {};

                                    self.hud.resetItems();

									cm.callbacks['hideLoader']();
									cm.callbacks['dayFinished'](self.params.level, self.params.invasion, self.params.day, data, function(){
                                        if(self.params.level > 0 || !data['test_level_finished']){
                                            self.params.invasion = data['next_invasion'];
                                            self.params.day = data['next_day'];
                                            self.loadDayParams(function(){
                                                self.startPhase(0);
                                                self.waveCompletedInProgress = false;
                                            });
                                        }
									});
								},
								function(){
									// TODO: error
									cm.callbacks['hideLoader']();
								}
							);
						});
					}, 1000);
				}
			},

			spawnWaveMonsters: function(){
				if(this.wave.completed){
					return 0;
				}
				var count = cm.min(this.wave.phaseMonsters - this.wave.phaseMonstersSpawned,
						this.wave.maxAliveMonsters - this.layers[this.LAYER.MONSTERS].childrenList.length);
				if(count > 0){
					if(this.wave.phaseMonsters >= 10
						&& this.wave.phaseMonsters - this.wave.phaseMonstersSpawned - count <= 1)
					{
						count = this.wave.phaseMonsters - this.wave.phaseMonstersSpawned;
					}

					var spawnArea = this.findBestSpawnArea(); // undefined, this.prevSpawnArea);
					// this.prevSpawnArea.push(spawnArea);

                    if(this.wave.phaseMonstersSpawned == 0 && this.wave.phaseParams.item){
                        var item = cm.clone(this.wave.phaseParams.item);
                        this.spawnItem( item, spawnArea );
                    }

                    if(!this.wave.phaseParams.monster){
                        this.wave.phaseMonsters = 0;
                        return 0;
                    }
                    /* if(!this.wave.phaseParams.monster){
                        console.log('!wave.phaseParams.monster', this.wave.phaseParams, this);
                    } */

					// cm.log('[spawnWaveMonsters] clone this.wave.phaseParams.monster');
					var monster, spawnRandMonster = this.wave.phaseParams.monster[0] !== undefined;
					count = cm.min(5, count);
					for(var i = 0; i < count; i++){
						if(i == 0 || spawnRandMonster){
							if(spawnRandMonster){
								monster = cm.clone(cm.randItem(this.wave.phaseParams.monster));
							}else{
								monster = cm.clone(this.wave.phaseParams.monster);
							}

							monster.health *= cm.param(this.wave.params.monsterHealthScale, 1);

							var speedScale = cm.param(this.wave.params.monsterSpeedScale, 1);
							monster.physics.minSpeed = cm.param(monster.physics.minSpeed, 20) * speedScale;
							monster.physics.maxSpeed = cm.param(monster.physics.maxSpeed, 100) * speedScale;

							monster.fire.damage *= cm.param(this.wave.params.monsterFireDamageScale, 1);
							monster.fire.speed *= cm.param(this.wave.params.monsterFireBulletSpeedScale, 1);
							monster.fire.density *= cm.param(this.wave.params.monsterFireBulletDensityScale, 1);

							if(this.wave.params.monsterAimOnDamage !== undefined){
								if((monster.physics.aimOnDamage = this.wave.params.monsterAimOnDamage) === true){
									// delete monster.physics.inverseDurationSec;
								}
							}
						}
						this.spawnMonster( monster, spawnArea );
						this.wavePhaseMonstersSpawned++;
						// cm.log("[wave spawn step] spawned "+this.wavePhaseMonstersSpawned);
					}
					this.wave.phaseMonstersSpawned += count;

                    // [begin debug]
					if(cm.logEnabled) cm.log("[wave spawn] "+this.params.day+" "+this.wave.phase
							+", need "+this.wave.phaseMonsters
							+", cur spawned "+count
							+", all spawned "+this.wave.phaseMonstersSpawned
							+", exist "+(this.layers[this.LAYER.MONSTERS].childrenList.length)
							+", max "+this.wave.maxAliveMonsters
							);
                    // [end debug]
					this.wave.completed = this.wave.phaseMonstersSpawned >= this.wave.phaseMonsters;
					return count;
				}
				return 0;
			},

			checkWaveTime: 0,
			checkWavePhase: function(){
				if(!this.loadingDayParams && this.time - this.checkWaveTime > 1000){
					this.checkWaveTime = this.time;

					var wave = this.wave.params;
					var phase = this.wave.phaseParams;

					if(!this.wave.completed){
						this.spawnWaveMonsters();
						return;
					}
					var curMonsters = this.layers[this.LAYER.MONSTERS].childrenList.length;
					if(phase.next !== undefined){
						if(phase.next.delaySec !== undefined
								&& this.time - this.wave.time < phase.next.delaySec * 1000){
							return;
						}
						if(phase.next.aliveMonsters !== undefined
								&& curMonsters > phase.next.aliveMonsters){
							return;
						}
					}
					if(this.wave.phase >= wave.phases.length-1){
						var m, p = this.player;
						/*
						cm.log("[checkWavePhase] "+curMonsters
							+(curMonsters == 1 ? ", m: "+(m=this.layers[this.LAYER.MONSTERS].childrenList[0]).desc.image.id
								+ ", ["+(m.x + m.width / 2)+","+(m.y + m.height / 2)+"]"
								+ ", p: ["+(p.x + p.width / 2)+","+(p.y + p.height / 2)+"]"
								: ""));
						*/
						if(curMonsters == 0){
							this.onWaveCompleted();
						}
					}else{
						this.startPhase(this.wave.phase+1);
					}
				}
			},

			monsterIdleTime: 0,
			monsterIdleMinDist: 100,
			monsterIdleMaxDist: 200,
			checkMonsterIdleSound: function(){
				if(this.time - this.monsterIdleTime >= 2000 && this.player){
					this.monsterIdleTime = this.time;
					var bestDist = 99999999999, bestMonster;
					var playerPos = cm.getActorCenter(this.player);
					var monstersList = this.layers[this.LAYER.MONSTERS].childrenList;
					for(var i = monstersList.length-1; i >= 0; i--){
						var monster = monstersList[i];
						if(monster.playIdleSound && !cm.isActorDead(monster)){
							var dist = cm.getActorCenter(monster).subtract(playerPos).getLength();
							if(dist >= this.monsterIdleMinDist && dist <= this.monsterIdleMaxDist && bestDist > dist){
								bestDist = dist;
								bestMonster = monster;
							}
						}
					}
					if(bestMonster){
						bestMonster.playIdleSound();
						this.hud.onAlert();
					}
				}
			},

            playerProtectionTime: 0,
            playerProtectionDist: 200,
            checkPlayerProtection: function(){
				if(this.time - this.playerProtectionTime >= 100 && this.player && cm.playerData.playTimeSec < this.player.protectionEndTimeSec){
					this.playerProtectionTime = this.time;
					var playerPos = cm.getActorCenter(this.player);
					var monstersList = this.layers[this.LAYER.MONSTERS].childrenList;
					for(var i = monstersList.length-1; i >= 0; i--){
						var monster = monstersList[i];
						if(monster.moveMonster && !cm.isActorDead(monster)){
							var dist = cm.getActorCenter(monster).subtract(playerPos).getLength();
							if(dist <= this.playerProtectionDist){
                                monster.moveMonster("inverse");
							}
						}
					}
                }
            },

			fixGoldsNumber: function(){
				// console.log('golds layer', this.LAYER.GOLDS, this.layers[this.LAYER.GOLDS].childrenList.length);
				var list = this.layers[this.LAYER.GOLDS].childrenList;
				for(var i = list.length - 50 - 1; i >= 0; i--){
					cm.deleteActor(list[i]);
				}
			},

			// paused: false,
			animate: function(director, time){
				/* if(cm.key.isPressed(cm.key.P)){
					// cm.paused = !cm.paused;
					cm.log("[paused] "+(cm.togglePause() ? "yes" : "no"));
				} */
				if(this.physics.world && !cm.paused){
					if(!this.findTiledMapPathInProgress){ // && this.time - this.findTiledMapPathTime >= 10){
						var bestTime = 99999999999, bestMonster, genericDeltaTime = 500;
                        if(this.params.level >= 7){
                            genericDeltaTime = 10;
                        }else if(this.params.level >= 6){
                            genericDeltaTime = 100;
                        }else if(this.params.level >= 5){
                            genericDeltaTime = 200;
                        }else if(this.params.level >= 4){
                            genericDeltaTime = 300;
                        }
						var allowGenericPathSearch = this.time - this.findTiledMapPathTime >= genericDeltaTime;
						var monstersList = this.layers[this.LAYER.MONSTERS].childrenList;
						for(var i = monstersList.length-1; i >= 0; i--){
							var monster = monstersList[i];
							if(monster.updatePath
								&& (allowGenericPathSearch || !monster.isMonsterVisible)
								// && (!monster.path || monster.time >= monster.pathNextTime)
								)
							{
								if(bestTime > monster.pathTime){
									bestTime = monster.pathTime;
									bestMonster = monster;
								}
								/* if(bestTime > monster.pathNextTime){
									bestTime = monster.pathNextTime;
									bestMonster = monster;
								} */
							}
						}
						if(bestMonster){
							bestMonster.updatePath();
						}
						// this.findTiledMapPathTime = time;
					}

					this.updateActivatedItems();
					this.checkWavePhase();
					this.checkMonsterIdleSound();
                    this.checkPlayerProtection();

					var curTimeMS = cm.getTimeMS();
					var deltaTimeMS = curTimeMS - this.oldTimeMS;
					this.deltaTimeSec = cm.min(deltaTimeMS / 1000.0, 0.1);
					this.oldTimeMS = curTimeMS;
					// cm.log("[dt] "+dt);
					if(this.deltaTimeSec > 0){
                        if(this.player && this.player.isPlayer){
                            cm.playerData.playTimeSec += this.deltaTimeSec;
                        }

						this.accumTimeSec += this.deltaTimeSec;
						// cm.log('accumTimeSec '+this.accumTimeSec);

						var dt = 1.0/30, iteration = 1;
						while(this.accumTimeSec >= dt){
							this.physics.world.Step(dt, iteration);
							this.accumTimeSec -= dt;
						}

						cm.physics.applyWorldToActors(this.physics.world);

						if(this.playerTiledMap){
							var tiledMapPos = this.actorToTileMapPos(this.player);
							var pos = this.tiledMapToActorPos(tiledMapPos);
							pos.x -= this.playerTiledMap.width/2;
							pos.y -= this.playerTiledMap.height/2;
							this.playerTiledMap.setLocation(pos.x, pos.y);
						}

						// cm.log("[connects] "+this.physics.world.m_contactCount);
						for (var c = this.physics.world.m_contactList; c; c = c.m_next){
							// if(c.m_manifoldCount > 0){
								var actor = c.m_shape1.m_body.actor;

								/* var actor2 = c.m_shape2.m_body.actor;
								if( (actor.desc && actor.desc.image && actor.desc.image.id) == 'ITEM_WEAPON_4' ){
									cm.log('FOUND CONTACT #1', actor.desc && actor.desc.image && actor.desc.image.id);
								}
								if( (actor2.desc && actor2.desc.image && actor2.desc.image.id) == 'ITEM_WEAPON_4' ){
									cm.log('FOUND CONTACT #2', actor2.desc && actor2.desc.image && actor2.desc.image.id);
								} */

								if(actor.onPhysicsContact !== undefined){
									if(actor.onPhysicsContact(c, 0)){
										// cm.log('contact processed', actor);
										continue;
									}
								}
								actor = c.m_shape2.m_body.actor;
								if(actor.onPhysicsContact !== undefined){
									actor.onPhysicsContact(c, 1);
								}
							/* }else{
								cm.log('m_manifoldCount == 0', c);
							} */
						}
						this.updateCamera();
					}
				}
				return cm.LevelScene.superclass.animate.call(this, director, time);
			},

			/*
			buildCheckPoints: function(){
				var tiledMap = this.tiledMap;
				tiledMap.checkPoints = [];
				for(var i in tiledMap["layers"]){
					var layer = tiledMap["layers"][i];
					if(layer["name"] == "checkpoints"){
						var width = layer["width"];
						var height = layer["height"];
						for(var x = 0; x < width; x++){
							for(var y = 0; y < height; y++){
								if(layer["map"][x] === undefined){
									continue;
								}
								var gid = layer["map"][x][y];
								if(gid !== undefined){
									gid -= tiledMap.physics.firstGid;
									if(gid == 4){
										tiledMap.checkPoints.push({
											x: x,
											y: y,
											vis: []
										});
									}
								}
							}
						}
					}
				}
				cm.log("[check point] count: "+tiledMap.checkPoints.length);

				// for(var i in tiledMap.checkPoints){
				for(var i = 0; i < tiledMap.checkPoints.length; i++){
					var checkPoint = tiledMap.checkPoints[i];
					// cm.log("[cp] "+cm.dump(checkPoint));
					for(var j = i+1; j < tiledMap.checkPoints.length; j++){
						var checkPoint2 = tiledMap.checkPoints[j];
						// cm.log("[cp2] "+cm.dump(checkPoint2));
						if(this.traceTiledMapLine( checkPoint, checkPoint2 )){
							var dx = checkPoint.x - checkPoint2.x;
							var dy = checkPoint.y - checkPoint2.y;
							var dist = cm.sqrt( dx*dx + dy*dy );
							checkPoint.vis.push( { p: checkPoint2, dist: dist } );
							checkPoint2.vis.push( { p: checkPoint, dist: dist } );
							cm.log("[check point] vis "+i+" <=> "+j);
						}
					}
				}
			},
			*/

			traceTiledMapLine: function(p1, p2, fly){
				var dx = p2.x - p1.x;
				var dy = p2.y - p1.y;
				// cm.log("[trace] "+dx+" "+dy);
				// return false;
				var dxAbs = cm.abs(dx);
				var dyAbs = cm.abs(dy);
				if(dxAbs == 0 && dyAbs == 0){
					return false;
				}
				var count = 0;
				if(dxAbs >= dyAbs){
					dx = dx >= 0 ? 1 : -1;
					dy /= dxAbs;
					count = dxAbs;
				}else{
					dx /= dyAbs;
					dy = dy >= 0 ? 1 : -1;
					count = dyAbs;
				}
				var map = this.tiledMap.physics.layer["map"];
				var physicsFirstGid = this.tiledMap.physics.firstGid;
				var x = p1.x, y = p1.y;
				var round = Math.round, col, cellGid;
				for(; count > 0; count--){
					x += dx;
					y += dy;
					var cellX = round(x);
					var cellY = round(y);
					if((col = map[cellX]) !== undefined && (cellGid = col[cellY]) !== undefined){
						switch(cellGid - physicsFirstGid){
						case 0: // water
							if(fly){
								break;
							}
							// no break

						case 1: // solid
							return false;
						}
					}
				}
				return true;
			},

			actorToTileMapPos: function(actor){
				return this.actorPosToTileMapPos( cm.getActorCenter(actor) );
			},

			actorPosToTileMapPos: function(p){
				return /*new*/ cm.Point( cm.floor(p.x / this.cellSize.x), cm.floor(p.y / this.cellSize.y) );
			},

			tiledMapToActorPos: function(p){
				var x = (p.x + 0.5) * this.cellSize.x;
				var y = (p.y + 0.5) * this.cellSize.y;
				return /*new*/ cm.Point( cm.round(x), cm.round(y) );
			},

			traceActorsTime: 0,
			traceActors: function(actor1, actor2, fly){
				var p1 = this.actorToTileMapPos(actor1);
				var p2 = this.actorToTileMapPos(actor2);
				return this.traceTiledMapLine(p1, p2, fly);
			},

			findTiledMapPathTime: 0,
			findTiledMapPathInProgress: false,
			findTiledMapPath: function(p1, p2, actor, fly, allowNotFinishedPath, callback){
				if(this.findTiledMapPathInProgress){
					callback(false);
					return;
				}

				var startTime = cm.getTimeMS();

				this.findTiledMapPathTime = this.time;
				this.findTiledMapPathInProgress = true;

				var tiledMap = this.tiledMap;
				var physicsLayer = tiledMap.physics.layer;

				var mapLayer = physicsLayer["map"];

				if(0){
					var map = mapLayer;
					if(map[p1.x] !== undefined && map[p1.x][p1.y] !== undefined){
						var cellGid = map[p1.x][p1.y] - physicsFirstGid;
						switch(cellGid){
						case 0: // water
						case 1: // solid
                            // [begin debug]
							if(cm.logEnabled) cm.log("[path] start in wall, actor "+actor.desc.image.id);
                            // [end debug]
							return false;
						}
					}
					if(map[p2.x] !== undefined && map[p2.x][p2.y] !== undefined){
						var cellGid = map[p2.x][p2.y] - physicsFirstGid;
						switch(cellGid){
						case 0: // water
						case 1: // solid
                            // [begin debug]
							if(cm.logEnabled) cm.log("[path] end in wall");
                            // [end debug]
							return false;
						}
					}
				}

				if(tiledMap.physics.groundMipmap === undefined){
					tiledMap.physics.groundMipmap = {};
					tiledMap.physics.flyMipmap = {};
				}
				var groundMipmapLayer = tiledMap.physics.groundMipmap;
				var flyMipmapLayer = tiledMap.physics.flyMipmap;

				var physicsFirstGid = tiledMap.physics.firstGid;

				// var mapEdge = 2;
				var __isTileBlocked = function(x, y){
					var map = mapLayer, mipmap = fly ? flyMipmapLayer : groundMipmapLayer;

					var col, cellGid, cellSolid, p1x, p1y, p2x, p2y;
					if( (x - 2-1 <= (p2x=p2.x) && p2x <= x + 2+1 && y - 2-1 <= (p2y=p2.y) && p2y <= y + 2+1)
							|| (x - 2-1 <= (p1x=p1.x) && p1x <= x + 2+1 && y - 2-1 <= (p1y=p1.y) && p1y <= y + 2+1) ){
						if((col = map[x]) !== undefined && (cellGid = col[y]) !== undefined){
							switch(cellGid - physicsFirstGid){
							case 0: // water
								return !fly;

							case 1: // solid
								return true;
							}
						}
						return false;
					}

					if((col = mipmap[x]) !== undefined){
						if((cellSolid = col[y]) !== undefined){
							return cellSolid;
						}
					}else{
						mipmap[x] = {};
					}

					var startX = x-2, endX = x+2;
					var startY = y-2, endY = y+2;
					for(var px = startX; px <= endX; px++){
						if((col = map[px]) === undefined){
							continue;
						}
						for(var py = startY; py <= endY; py++){
							if((cellGid = col[py]) !== undefined){
								switch(cellGid - physicsFirstGid){
								case 0: // water
									return mipmap[x][y] = !fly;

								case 1: // solid
									return mipmap[x][y] = true;
								}
							}
						}
					}
					return mipmap[x][y] = false;
				};

				var physicsLayerHeight = physicsLayer.height;

				var __posToGid = function(p){
					return p.y * physicsLayerHeight + p.x;
				};

				var __xyToGid = function(x, y){
					return y * physicsLayerHeight + x;
				};

				var __dist = function(x, y){
					// return cm.sqrt(x*x + y*y);
					if(x < 0) x = -x;
					if(y < 0) y = -y;
					if(x > y){
						return x + y*0.5;
					}
					return y + x*0.5;
				}

				var node = {
					x: p1.x, y: p1.y,
					weightG: 0,
					weightH: 0,
					weight: 0,
					gid: 0,
					closed: true,
					parent: null
				};
				node.gid = __posToGid(node);
				node.weightH = __dist(p2.x - node.x, p2.y - node.y);
				node.weight = node.weightG + node.weightH;

				var __openNodes = {};
				var __nodes = {};
				__nodes[ node.gid ] = node;

				var __endNodeGid = __posToGid(p2);

				if(allowNotFinishedPath === undefined){
					allowNotFinishedPath = true;
				}

				// var self = this, iterateNum = 0;
				var __max = cm.max, __min = cm.min;
				// var curNode = node;
				function iterateFindPath(self, curNode, iterateNum, allSteps){
					var max = __max, min = __min,
						nodes = __nodes,
						openNodes = __openNodes,
						endNodeGid = __endNodeGid,
						xyToGid = __xyToGid,
						posToGid = __posToGid,
						dist = __dist,
						isTileBlocked = __isTileBlocked,
						physicsLayerWidth = physicsLayer.width,
						physicsLayerHeight = physicsLayer.height,
						iterStartTime = cm.getTimeMS();

					for(var steps = 0;; steps++){
						if(curNode.gid == endNodeGid){
							var path = [ curNode ];
							while(curNode.parent != null){
								curNode = curNode.parent;
								path.push(curNode);
							}
							path.reverse();
							var dt = cm.getTimeMS() - startTime;
							// cm.log("[path] found weight "+cm.round(path[path.length-1].weight, 2)+", nodes "+path.length+", iter "+(iterateNum+1)+", steps "+allSteps+", dt "+cm.round(dt, 2));

							self.findTiledMapPathInProgress = false;
							callback(path);
							return; // path;
						}
						if(steps >= 500){
							var curTime = cm.getTimeMS();
							var dt = curTime - startTime;
							if((allSteps += steps) >= 10000){
								if(allowNotFinishedPath){
									var path = [ curNode ];
									while(curNode.parent != null){
										curNode = curNode.parent;
										path.push(curNode);
									}
									path.reverse();
									// [begin debug]
                                    if(cm.logEnabled) cm.log("[path] found UNFINISHED weight "+cm.round(path[path.length-1].weight, 2)+", nodes "+path.length+", iter "+(iterateNum+1)+", steps "+allSteps+", dt "+cm.round(dt, 2));
                                    // [end debug]

									self.findTiledMapPathInProgress = false;
									callback(path);
									return; // path;
								}
                                // [begin debug]
								if(cm.logEnabled) cm.log("[path] break find, iter "+(iterateNum+1)+", steps "+allSteps+", dt "+cm.round(dt, 2));
                                // [end debug]

								self.findTiledMapPathInProgress = false;
								callback(false);
								return; // false;
							}
							// cm.log("[path] iter "+(iterateNum+1)+", steps "+allSteps+", cur dt "+(curTime - iterStartTime)+", dt "+cm.round(dt, 2));
							setTimeout(function(){iterateFindPath(self, curNode, iterateNum+1, allSteps);}, 0);
							return;
						}
						var bestNode = null;
						var bestWeight = 9999999999;

						var curX = curNode.x;
						var curY = curNode.y;
						// isTileBlocked(curX, curY);

						var startX = max(0, curX-1);
						var endX = min(physicsLayerWidth-1, curX+1);

						var startY = max(0, curY-1);
						var endY = min(physicsLayerHeight-1, curY+1);

						for(var px = startX; px <= endX; px++){
							var dx = curX - px;
							for(var py = startY; py <= endY; py++){
								var dy = curY - py;
								if(!(dx | dy)){
									continue;
								}
								var gid = xyToGid(px, py);
								var node = nodes[ gid ];
								if(node === undefined){
									if(isTileBlocked(px, py)){
										continue;
									}
									var node = {
										x: px, y: py,
										weightG: dist(dx, dy) + curNode.weightG,
										weightH: 0,
										weight: 0,
										gid: gid,
										closed: false, // dx == 0 && dy == 0
										parent: curNode
									};
									node.weightH = dist(p2.x - px, p2.y - py);
									node.weight = node.weightG + node.weightH;

									nodes[ gid ] = node;
									openNodes[ gid ] = node;
									// cm.log("[path] new node "+gid+", pos "+px+" "+py);
								}else{
									if(node.closed){
										continue;
									}
									var weightG = dist(dx, dy) + curNode.weightG;
									if(node.weightG > weightG){
										node.weightG = weightG;
										node.weight = weightG + node.weightH;
										node.parent = curNode;
										// node.closed = false;
										// cm.log("[path] node "+node.gid+" => parent "+gid);
									}
								}
								if(bestWeight > node.weight){
									bestWeight = node.weight;
									bestNode = node;
								}
							}
						}
						if(bestNode){
							curNode = bestNode;
							curNode.closed = true;
							delete openNodes[ curNode.gid ];
							continue;
						}
                        var saveNode = curNode;
						if(curNode.parent){
							var i = 0;
							do{
								curNode = curNode.parent;
							}while(curNode && ++i < 10);
							if(curNode){
								continue;
							}
						}
						curNode = null;
						var bestWeight = 9999999999;
						for(var i in openNodes){
							var node = openNodes[i];
							if(bestWeight > node.weight){
								bestWeight = node.weight;
								curNode = node;
							}
						}
						if(!curNode){
                            if(0 && allowNotFinishedPath){
                                curNode = saveNode;
                                var path = [ curNode ];
                                while(curNode.parent != null){
                                    curNode = curNode.parent;
                                    path.push(curNode);
                                }
                                path.reverse();
                                // [begin debug]
                                if(cm.logEnabled) cm.log("[path] UNFINISHED [2] weight "+cm.round(path[path.length-1].weight, 2)+", nodes "+path.length+", iter "+(iterateNum+1)+", steps "+allSteps+", dt "+cm.round(dt, 2));
                                // [end debug]

                                self.findTiledMapPathInProgress = false;
                                callback(path);
                                return; // path;
                            }
                            // [begin debug]
							if(cm.logEnabled) cm.log("[path] not found");
                            // [end debug]

							self.findTiledMapPathInProgress = false;
							callback(false);
							return; // false;
						}
						curNode.closed = true;
						delete openNodes[ curNode.gid ];
					}
					self.findTiledMapPathInProgress = false;
					callback(false);
					// return; // false; // never reached
				};
				iterateFindPath(this, node, 0, 0);
			},

			initTiledMap: function(cellSize, tiledMap){
				/* if(tiledMap === undefined){
					tiledMap = cm.use_level2_map ? cm.level2TiledMap : cm.levelTestTiledMap;
				} */
				var levelMap = /*new*/ cm.LevelMap();
				levelMap.cellSize = cellSize;
				levelMap.tiledMap = tiledMap;

				tiledMap.physics = {};

				for(var i = 0; i < tiledMap["tilesets"].length; i++){
					var tileset = tiledMap["tilesets"][i];
					if(tileset["name"] == "physics-tiles"){
						tiledMap.physics.tileset = tileset;
						tiledMap.physics.firstGid = tileset["firstgid"];
						// [begin debug]
                        if(cm.logEnabled) cm.log("[firstPhysGid] "+tiledMap.physics.firstGid);
                        // [end debug]
						break;
					}
				}

				for(var i = 0; i < tiledMap["layers"].length; i++){
					var layer = tiledMap["layers"][i];
					if(layer["name"] == "physics"){
						tiledMap.physics.layer = layer;
						var width = layer["width"];
						var height = layer["height"];
						for(var x = 0; x < width; x++){
							for(var y = 0; y < height; y++){
								if(layer["map"][x] === undefined){
									continue;
								}
								var gid = layer["map"][x][y];
								if(gid !== undefined){
									var desc = {};
									gid -= tiledMap.physics.firstGid;
									switch(gid){
									case 0: // water
										desc = cm.extend( cm.use_map_shape_debug ? {
											fillStyle: "#99c",
											alpha: 0.5
										} : {}, {
											physics: {
												categoryBits: cm.physics.CAT_BIT_HOLE
											}
										});
										break;

									case 1: // solid
										desc = {
											physics: {
												categoryBits: cm.physics.CAT_BIT_STATIC
											}
										};
										break;

									case 2: // player spawn
										desc = cm.extend( cm.use_map_shape_debug ? {
											fillStyle: "#9c9",
											alpha: 0.5
										} : {}, {
											physics: {
												categoryBits: cm.physics.CAT_BIT_PLAYER_SPAWN
											}
										});
										break;

									case 3: // monster spawn
										desc = {
											// outside: true,
											// monsterSpawnArea: true,
											physics: {
												categoryBits: cm.physics.CAT_BIT_MONSTER_AREA | cm.physics.CAT_BIT_MONSTER_SPAWN
											}
										};
										break;
									}
									levelMap.setRect( x, y, 1, 1, desc );
								}
							}
						}
					}else if(layer["name"] == "floor"){
						tiledMap.floorLayer = layer;
					}
				}

				/*
				this.tiledMap = tiledMap;
				this.buildCheckPoints();
				for(var i in tiledMap.checkPoints){
					var checkPoint = tiledMap.checkPoints[i];
					levelMap.setRect( x, y, 1, 1, { fillStyle: "#cc9" } );
				}
				*/

				return levelMap;
			},

			__dummy__: 0
		};

		extend( cm.LevelScene, CAAT.Scene, null);

	})();

	return {
		"api": {
			"create": function(){return cm.create.apply(cm, arguments);},

			"pause": function(){return cm.pause();},
			"unpause": function(){return cm.unpause();},
			"togglePause": function(){return cm.togglePause();},
			"isPaused": function(){return cm.paused;},

			"setSoundEnabled": function(value){cm.sound_enabled = value;},
			"isSoundEnabled": function(){return cm.sound_enabled;},

			"isPathVisible": function(){return cm.use_path_debug;},
			"setPathVisible": function(value){cm.use_path_debug = value;},

			"isLogEnabled": function(){return cm.logEnabled;},
			"setLogEnabled": function(value){cm.logEnabled = value;},

			"ajax": function(){return cm.ajax.apply(cm, arguments);},

			/*
			"ajaxCrypt": cm.ajaxCrypt,
			},
			*/

			"getItemsData": function(){return cm.clone(cm.playerData.originItems);},
			"getItemCountData": function(){return cm.getItemCountData.apply(cm, arguments);},

			"getItemRemainPercentage": function(){return cm.getItemRemainPercentage.apply(cm, arguments);},

            "initItemsActivated": function(){return cm.initItemsActivated.apply(cm, arguments);},

			"ajaxUseItem": function(){return cm.ajaxUseItem.apply(cm, arguments);},
			"ajaxTouchItem": function(){return cm.ajaxTouchItem.apply(cm, arguments);},

			"ajaxTestError": function(){return cm.ajax(cm.urls['testError']);},

			"getDayStats": function(){return cm.level.getDayResult();},
            "getLevelParams": function(){
                return {
                    'level': cm.level.params.level,
                    'invasion': cm.level.params.invasion,
                    'day': cm.level.params.day
                }
            },

			"playSound": function(params){
				if(typeof params == "string" || typeof params == "number"){
					params = {'sound':[""+params]};
				}else if(!params){
					return;
				}
				return cm.sound.play({
						actor: params['actor'],
						channel: params['channel'],
						sound: params['sound'],
						lock_ms: params['lock_ms'],
						loop: params['loop'],
						priority: params['priority'],
						volume: params['volume'],
						each: params['each']
					});
			},
			"stopSound": function(params){
				if(params){
                    return cm.sound.stop({
                        actor: params['actor'],
                        channel: params['channel']
                    });
                }
			},
            "stopMusic": function(){
                return cm.sound.stopMusic.apply(cm.sound, arguments);
            },
            "playMusic": function(){return cm.playMusic.apply(cm, arguments);},
			"setSoundVolume": function(params){
				if(params){
                    return cm.sound.setVolume({
						actor: params['actor'],
						channel: params['channel'],
                        volume: params['volume']
					});
                }
			},
            "setMusicVolume": function(volume){
                return this["setSoundVolume"]({"actor":"level", "channel":"music", 'volume':volume});
            },
			"getSoundVolume": function(params){
				if(params){
                    return cm.sound.getVolume({
						actor: params['actor'],
						channel: params['channel']
					});
                }
			},
            "getMusicVolume": function(volume){
                return this["getSoundVolume"]({"actor":"level", "channel":"music"});
            },
            "fadeMusicOut": function(){return cm.sound.fadeMusicOut.apply(cm.sound, arguments);},
            "toggleSoundMode": function(){return cm.toggleSoundMode.apply(cm, arguments);},
            "getSoundMode": function(){return cm.getSoundMode.apply(cm, arguments);},

			__dummy__: 0
		}
	};
})();

/*
$(function(){
	// cm.create( 900, 600, document.getElementById('test-canvas') );
	CAAT.optimizeModelViewMatrix = true;
});
*/