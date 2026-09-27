(function () {
  "use strict";

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  var byName = function (name) { return document.querySelector('[name="' + CSS.escape(name) + '"]'); };
  var STORE_KEY = "tormenta20.ficha.v1";
  var ATTRS = window.T20_ATTRIBUTES;
  var SKILLS = window.T20_SKILLS;
  var RACES = window.T20_RACES;
  var CLASSES = window.T20_CLASSES;
  var ORIGINS = window.T20_ORIGINS;
  var WEAPONS = window.T20_WEAPONS;
  var ARMORS = window.T20_ARMORS;
  var GENERAL_ITEMS = window.T20_GENERAL_ITEMS || [];
  var SPELLS = window.T20_SPELL_CATALOG || [];
  var attacks = [];
  var inventory = [];
  var powers = [];
  var knownSpells = [];
  var toastTimer = null;
  var saveTimer = null;
  var cachedTrackKey = "";
  var cachedSkillFormKey = "";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function option(select, value, label) {
    var item = document.createElement("option");
    item.value = value;
    item.textContent = label;
    select.appendChild(item);
  }
  function num(name, fallback) {
    var input = byName(name);
    var value = input ? Number(input.value) : Number(fallback || 0);
    return Number.isFinite(value) ? value : 0;
  }
  function val(name, fallback) {
    var input = byName(name);
    return input ? input.value : (fallback || "");
  }
  function setVal(name, value) {
    var input = byName(name);
    if (input && value !== undefined && value !== null) input.value = value;
  }
  function signed(value) { return (value > 0 ? "+" : "") + value; }
  function safeText(value) { return value == null ? "" : String(value); }
  function byId(list, id) { return list.find(function (entry) { return entry.id === id; }) || null; }
  function skill(id) { return byId(SKILLS, id); }
  function currentClass() { return byId(CLASSES, val("class")); }
  function currentRace() { return byId(RACES, val("race")); }
  function currentOrigin() { return byId(ORIGINS, val("origin")); }
  function currentLevel() { return Math.max(1, Math.min(20, Math.floor(num("level", 1) || 1))); }
  function attrName(id) {
    var found = byId(ATTRS, id);
    return found ? found.name : "Atributo";
  }
  function showToast(message) {
    var node = $("#toast");
    node.textContent = message;
    node.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("visible"); }, 2100);
  }

  function fillNamedSelect(name, entries, placeholder) {
    var select = byName(name);
    if (!select) return;
    var old = select.value;
    select.textContent = "";
    if (placeholder) option(select, "", placeholder);
    entries.forEach(function (item) { option(select, item.id, item.name); });
    if (entries.some(function (item) { return item.id === old; })) select.value = old;
  }

  function populateDataSelects() {
    fillNamedSelect("race", RACES, "Escolha uma raça");
    fillNamedSelect("origin", ORIGINS, "Escolha uma origem");
    fillNamedSelect("class", CLASSES, "Escolha uma classe");
    var attrs = ATTRS.map(function (item) { return {id:item.id,name:item.name}; });
    ["race_flex_1","race_flex_2","race_flex_3"].forEach(function (name) {
      var select = byName(name);
      select.textContent = "";
      option(select, "", "Escolha");
      attrs.forEach(function (item) { option(select, item.id, item.name); });
    });
    var armor = byName("equipped_armor");
    armor.textContent = "";
    option(armor, "", "Sem armadura");
    ARMORS.filter(function (item) { return item.kind !== "shield"; }).forEach(function (item) { option(armor, item.id, item.name); });
    var shield = byName("equipped_shield");
    shield.textContent = "";
    option(shield, "", "Sem escudo");
    ARMORS.filter(function (item) { return item.kind === "shield"; }).forEach(function (item) { option(shield, item.id, item.name); });
    var weaponPicker = $("#weapon-picker");
    var itemPicker = $("#item-picker");
    weaponPicker.textContent = "";
    itemPicker.textContent = "";
    option(weaponPicker, "", "Escolha uma arma");
    option(itemPicker, "", "Escolha um item");
    WEAPONS.filter(function (item) { return item.mode !== "gear"; }).forEach(function (item) {
      option(weaponPicker, item.id, item.name + " · " + item.damage);
    });
    WEAPONS.forEach(function (item) { option(itemPicker, "weapon:" + item.id, item.name + " · arma"); });
    ARMORS.forEach(function (item) { option(itemPicker, "armor:" + item.id, item.name + " · equipamento"); });
    GENERAL_ITEMS.forEach(function (item) { option(itemPicker, "item:" + item.id, item.name + " · item"); });
  }

  function makeAttributes() {
    var root = $("#attributes");
    root.textContent = "";
    ATTRS.forEach(function (item) {
      var box = el("div", "attribute-card");
      var label = el("span", "attr-name", item.short);
      var final = el("strong", "attr-final", "0");
      final.id = "final-" + item.id;
      var input = el("input");
      input.type = "number";
      input.min = "-1";
      input.max = "4";
      input.step = "1";
      input.value = "0";
      input.name = "attr_" + item.id;
      input.setAttribute("aria-label", item.name + " básico");
      var adjust = el("span", "attr-adjust", "Raça +0");
      adjust.id = "adjust-" + item.id;
      var meta = el("span", "attr-meta", item.name);
      box.append(label, final, input, adjust, meta);
      root.appendChild(box);
    });
  }

  function createHumanSkillControls() {
    var box = $("#flex-race-box");
    var wrap = el("div", "human-skills-grid");
    wrap.id = "human-skills-grid";
    ["race_skill_1","race_skill_2"].forEach(function (name, index) {
      var label = el("label", "field");
      var title = el("span", "", "Perícia Versátil " + (index + 1));
      var select = el("select");
      select.name = name;
      option(select, "", "Escolha uma perícia");
      SKILLS.forEach(function (entry) { option(select, entry.id, entry.name); });
      label.append(title, select);
      wrap.appendChild(label);
    });
    box.appendChild(wrap);
  }

  function attrBase(id) { return num("attr_" + id, 0); }
  function raceModifiers() {
    var race = currentRace();
    var mods = Object.assign({}, race && race.mods ? race.mods : {});
    if (!race) return mods;
    if (race.id === "suraggel") {
      if (val("race_variant") === "sulfure") mods = {dex:2,int:1};
      else mods = {wis:2,cha:1};
    }
    if (race.flex) {
      var selected = [];
      ["race_flex_1","race_flex_2","race_flex_3"].forEach(function (name) {
        var id = val(name);
        if (!id || selected.indexOf(id) >= 0 || (race.flexExclude || []).indexOf(id) >= 0) return;
        selected.push(id);
        mods[id] = (mods[id] || 0) + 1;
      });
    }
    return mods;
  }
  function finalAttr(id) { return attrBase(id) + (raceModifiers()[id] || 0); }

  function updateRaceControls(setDefaults) {
    var race = currentRace();
    var box = $("#flex-race-box");
    var selects = $$(".flex-race-selects select");
    var showFlex = !!(race && race.flex);
    box.hidden = !showFlex && !(race && race.flexSkills);
    selects.forEach(function (select) {
      select.disabled = !showFlex;
      var old = select.value;
      var selectId = Number(select.name.slice(-1));
      var excluded = race && race.flexExclude ? race.flexExclude : [];
      select.textContent = "";
      option(select, "", "Escolha");
      ATTRS.filter(function (entry) { return excluded.indexOf(entry.id) < 0; }).forEach(function (entry) {
        option(select, entry.id, entry.name);
      });
      if (old && ATTRS.some(function (entry) { return entry.id === old; }) && excluded.indexOf(old) < 0) select.value = old;
      else if (showFlex) select.value = (selectId === 1 ? "str" : selectId === 2 ? "dex" : "con");
    });
    $("#human-skills-grid").hidden = !(race && race.flexSkills);
    var variantField = byName("race_variant").closest(".field");
    variantField.hidden = !(race && race.variant);
    $("#race-traits").textContent = race
      ? "Traços de " + race.name + ": " + ((race.traits || []).join(" · ") || "sem traços especiais listados") + ". Ajustes de atributo" +
        ((race.hpBonus || race.hpPerLevelBonus) ? ", PV" : "") + ((race.pmPerLevelBonus) ? ", PM" : "") +
        ((race.defenseBonus) ? ", Defesa" : "") + " são aplicados quando disponíveis; registre outros efeitos em Outros ou em Habilidades."
      : "";
    if (setDefaults && race) {
      setVal("size", race.size || "Médio");
      setVal("speed", race.speed || (race.id === "elfo" ? 12 : 9));
    }
  }

  function renderOriginBenefits(reset) {
    var origin = currentOrigin();
    ["origin_benefit_1","origin_benefit_2"].forEach(function (name, index) {
      var select = byName(name);
      var old = reset ? "" : select.value;
      select.textContent = "";
      option(select, "", "Escolha um benefício");
      if (origin) {
        var skillOptions = (origin.skills || []).flatMap(function (id) {
          if (id === "any") return SKILLS.map(function (s) { return {value:"skill:" + s.id,label:"Perícia: " + s.name}; });
          var actualId = id.indexOf("craft_") === 0 ? "craft" : id;
          var meta = skill(actualId);
          return meta ? [{value:"skill:" + actualId,label:"Perícia: " + meta.name}] : [];
        });
        skillOptions.forEach(function (item) { option(select, item.value, item.label); });
        (origin.powers || []).forEach(function (nameValue) { option(select, "power:" + nameValue, "Poder: " + nameValue); });
      }
      if (old && Array.from(select.options).some(function (item) { return item.value === old; })) select.value = old;
    });
    $("#origin-items").textContent = origin ? "Itens de origem: consulte a descrição da origem no livro e registre-os no inventário." : "Selecione uma origem para ver seus benefícios.";
  }

  function classChoices() {
    var meta = currentClass();
    var host = $("#class-training-help");
    var oldValues = $$("select[data-class-choice]", host).map(function (select) { return select.value; });
    host.textContent = "";
    if (!meta) {
      $("#class-skills-summary").textContent = "Selecione uma classe para ver as perícias iniciais e as opções de treinamento.";
      return;
    }
    var fixedNames = (meta.fixed || []).map(function (id) { return skill(id) ? skill(id).name : id; });
    var summary = "Treinamento inicial: " + (fixedNames.length ? fixedNames.join(", ") : "nenhuma perícia fixa") +
      (meta.choose ? "; " + meta.choose + " perícias à escolha" : "") +
      ". Inteligência positiva concede perícias treinadas adicionais à sua escolha.";
    $("#class-skills-summary").textContent = summary;
    if (meta.choice) {
      meta.choice.forEach(function (group, index) {
        var label = el("label", "field");
        var title = el("span", "", "Perícia obrigatória " + (index + 1));
        var select = el("select");
        select.setAttribute("data-class-choice", String(index));
        select.name = "class_choice_" + index;
        option(select, "", "Escolha uma opção");
        group.forEach(function (id) { option(select, id, skill(id) ? skill(id).name : id); });
        if (oldValues[index] && group.indexOf(oldValues[index]) >= 0) select.value = oldValues[index];
        label.append(title, select);
        host.appendChild(label);
      });
    }
    var note = el("p", "training-help", "");
    note.textContent = "Marque abaixo as perícias escolhidas da classe e as perícias adicionais por Inteligência. O cálculo mostra se a quantidade ultrapassa as escolhas disponíveis.";
    host.appendChild(note);
  }

  function selectedOriginSkills() {
    var result = [];
    ["origin_benefit_1","origin_benefit_2"].forEach(function (name) {
      var item = val(name);
      if (item.indexOf("skill:") === 0) result.push(item.slice(6));
    });
    return result;
  }
  function selectedRaceSkills() {
    var race = currentRace();
    if (!race || !race.flexSkills) return [];
    return ["race_skill_1","race_skill_2"].map(function (name) { return val(name); }).filter(Boolean);
  }
  function classRequiredSkills() {
    var meta = currentClass();
    if (!meta) return [];
    var result = (meta.fixed || []).slice();
    (meta.choice || []).forEach(function (group, index) {
      var choice = val("class_choice_" + index);
      if (choice && group.indexOf(choice) >= 0) result.push(choice);
    });
    return result;
  }
  function trainedSkills() {
    var result = new Set(classRequiredSkills());
    selectedOriginSkills().forEach(function (id) { result.add(id); });
    selectedRaceSkills().forEach(function (id) { result.add(id); });
    SKILLS.forEach(function (entry) {
      var check = byName("train_" + entry.id);
      if (check && check.checked) result.add(entry.id);
    });
    return result;
  }
  function trainingBonus() {
    var level = currentLevel();
    return level >= 15 ? 6 : level >= 7 ? 4 : 2;
  }
  function armorPenaltyState() {
    var armor = byId(ARMORS, val("equipped_armor"));
    var shield = byId(ARMORS, val("equipped_shield"));
    return {
      armor: armor ? armor.penalty : 0,
      shield: shield ? shield.penalty : 0,
      notProficientArmor: !!(armor && armor.kind === "heavy" && !(currentClass() && currentClass().prof.indexOf("heavy") >= 0)),
      notProficientShield: !!(shield && !(currentClass() && currentClass().prof.indexOf("shield") >= 0))
    };
  }
  function skillValue(id) {
    var meta = skill(id);
    if (!meta) return 0;
    var value = Math.floor(currentLevel() / 2) + finalAttr(meta.attr);
    if (trainedSkills().has(id)) value += trainingBonus();
    var other = num("skill_other_" + id, 0);
    var penalty = armorPenaltyState();
    var totalPenalty = penalty.armor + penalty.shield + num("armor_penalty_other", 0) + (currentRace() ? currentRace().armorPenalty || 0 : 0);
    var abilityBased = meta.attr === "str" || meta.attr === "dex";
    if (meta.armor || (abilityBased && (penalty.notProficientArmor || penalty.notProficientShield))) value += totalPenalty;
    return value + other;
  }

  function renderSkills() {
    var body = $("#skills-table");
    var previousManual = new Set($$("input[name^='train_']:checked:not(:disabled)", body).map(function (input) { return input.name.slice(6); }));
    body.textContent = "";
    var locked = new Set(classRequiredSkills().concat(selectedOriginSkills(), selectedRaceSkills()));
    SKILLS.forEach(function (entry) {
      var row = document.createElement("tr");
      var cellTrain = document.createElement("td");
      var check = el("input", "skill-check");
      check.type = "checkbox";
      check.name = "train_" + entry.id;
      check.setAttribute("aria-label", "Treinamento em " + entry.name);
      check.checked = locked.has(entry.id) || previousManual.has(entry.id);
      check.disabled = locked.has(entry.id);
      cellTrain.appendChild(check);
      if (check.disabled) row.classList.add("row-locked");
      var cellName = el("td", "skill-name", entry.name + (entry.trained ? " · T" : "") + (entry.armor ? " · armadura" : ""));
      var cellAttr = el("td", "skill-attr", ATTRS.find(function (a) { return a.id === entry.attr; }).short);
      var cellValue = document.createElement("td");
      var valueInput = el("input", "skill-value");
      valueInput.type = "text";
      valueInput.readOnly = true;
      valueInput.name = "skill_value_" + entry.id;
      cellValue.appendChild(valueInput);
      var cellOther = document.createElement("td");
      var otherInput = el("input", "skill-other");
      otherInput.type = "number";
      otherInput.name = "skill_other_" + entry.id;
      otherInput.value = "0";
      otherInput.setAttribute("aria-label", "Outros bônus em " + entry.name);
      cellOther.appendChild(otherInput);
      var cellRoll = document.createElement("td");
      var roll = el("button", "roll-button", "Rolar");
      roll.type = "button";
      roll.dataset.rollSkill = entry.id;
      cellRoll.appendChild(roll);
      row.append(cellTrain, cellName, cellAttr, cellValue, cellOther, cellRoll);
      body.appendChild(row);
    });
    cachedSkillFormKey = [val("class"),val("origin"),val("class_choice_0"),val("class_choice_1"),val("race"),val("race_skill_1"),val("race_skill_2"),val("level")].join("|");
    updateSkillValues();
  }

  function updateSkillValues() {
    var trained = trainedSkills();
    var count = trained.size;
    $("#training-summary").textContent = count + " treinadas";
    SKILLS.forEach(function (entry) {
      var input = byName("skill_value_" + entry.id);
      if (input) input.value = signed(skillValue(entry.id));
    });
    var manualCount = SKILLS.filter(function (entry) {
      var check = byName("train_" + entry.id);
      return !!(check && check.checked && !check.disabled);
    }).length;
    var meta = currentClass();
    var allowance = (meta ? meta.choose : 0) + Math.max(0, finalAttr("int"));
    var footer = $("#training-footer");
    var message = "Perícias treinadas: " + count + ". Escolhas adicionais marcadas: " + manualCount + " de " + allowance +
      " (classe + Inteligência positiva). Origem e raça somam benefícios próprios.";
    footer.textContent = message;
    footer.classList.toggle("warn", manualCount > allowance);
  }

  function pointCost(value) {
    var costs = {"-1":-1,"0":0,"1":1,"2":2,"3":4,"4":7};
    return Object.prototype.hasOwnProperty.call(costs, String(value)) ? costs[String(value)] : null;
  }

  function updateAttributeDisplays() {
    var mods = raceModifiers();
    ATTRS.forEach(function (item) {
      $("#final-" + item.id).textContent = signed(finalAttr(item.id));
      $("#adjust-" + item.id).textContent = "Raça " + signed(mods[item.id] || 0);
    });
    var values = ATTRS.map(function (item) { return attrBase(item.id); });
    var costs = values.map(pointCost);
    var total = costs.some(function (value) { return value === null; }) ? 99 : costs.reduce(function (sum, value) { return sum + value; }, 0);
    var point = $("#point-buy");
    point.textContent = "Compra por pontos: " + (10 - total) + " / 10";
    point.classList.toggle("over", total > 10 || total < 0 || costs.some(function (value) { return value === null; }));
    point.title = "Valores básicos antes dos ajustes raciais; valores permitidos de -1 a 4.";
  }

  function renderClassTrack() {
    var key = val("class") + "|" + currentLevel();
    if (key === cachedTrackKey) return;
    cachedTrackKey = key;
    var root = $("#class-track");
    root.textContent = "";
    var meta = currentClass();
    if (!meta) {
      root.appendChild(el("div", "empty-state", "Escolha uma classe para ver os avanços por nível."));
      return;
    }
    var level = currentLevel();
    $("#level-summary").textContent = String(level);
    for (var n = 1; n <= 20; n += 1) {
      var features = (meta.features && meta.features[n] ? meta.features[n] : []).slice();
      if (n >= 2) features.unshift("Poder de " + meta.name.toLocaleLowerCase("pt-BR"));
      if (meta.circleLevels && meta.circleLevels.indexOf(n) >= 0) {
        var circle = meta.circleLevels.indexOf(n) + 1;
        features.push("Magias (" + circle + "º círculo)");
      }
      if (!features.length) features.push("Progressão da classe");
      var row = el("div", "track-row" + (n <= level ? " unlocked" : ""));
      var levelBox = el("span", "track-level", n);
      var featureText = el("div", "track-features", features.join(" · "));
      row.append(levelBox, featureText);
      root.appendChild(row);
    }
  }

  function magicInfo() {
    var meta = currentClass();
    if (!meta || !meta.magic) return null;
    var chosen = val("magic_attribute", "auto");
    var key = chosen !== "auto" ? chosen : meta.magicAttr;
    if (meta.id === "arcanista" && chosen === "auto") {
      var path = val("class_path").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (path.indexOf("feiticeiro") >= 0) key = "cha";
    }
    return {type:meta.magic,attr:key};
  }

  function maxMagicCircle() {
    var meta = currentClass();
    if (!meta || !meta.circleLevels) return 0;
    var unlocked = meta.circleLevels.filter(function (level) { return level <= currentLevel(); });
    return unlocked.length;
  }

  function updateSpellMetrics() {
    var info = magicInfo();
    if (!info) {
      ["spell-dc","spell-dc-side","spell-attribute-label","max-circle","spell-pm-limit","pm-limit"].forEach(function (id) { $("#" + id).textContent = "—"; });
      $("#spell-type").value = "all";
      return;
    }
    var dc = 10 + Math.floor(currentLevel() / 2) + finalAttr(info.attr);
    var label = attrName(info.attr);
    var circle = maxMagicCircle();
    $("#spell-dc").textContent = String(dc);
    $("#spell-dc-side").textContent = String(dc);
    $("#spell-attribute-label").textContent = label;
    $("#max-circle").textContent = circle ? circle + "º" : "Nenhum";
    $("#spell-pm-limit").textContent = String(currentLevel());
    $("#pm-limit").textContent = String(currentLevel());
    var type = $("#spell-type");
    if (type.value === "all" || !type.dataset.touched) type.value = info.type;
  }

  function updateResources() {
    var meta = currentClass();
    var race = currentRace();
    var level = currentLevel();
    var con = finalAttr("con");
    var hp = meta ? meta.hp + con + (level - 1) * (meta.hpLevel + con) : 0;
    if (race) hp += (race.hpBonus || 0) + (level - 1) * (race.hpPerLevelBonus || 0);
    hp += num("pv_other", 0);
    var pm = meta ? meta.pm * level : 0;
    if (race) pm += (race.pmPerLevelBonus || 0) * level;
    if (meta && meta.pmAttr) pm += finalAttr(meta.pmAttr);
    pm += num("pm_other", 0);
    hp = Math.max(0, Math.floor(hp));
    pm = Math.max(0, Math.floor(pm));
    $("#pv-max").textContent = String(hp);
    $("#pm-max").textContent = String(pm);
    $("#rest-recovery").textContent = String(level) + " PV / " + String(level) + " PM";
    if (!meta) {
      $("#rest-recovery").textContent = "—";
      $("#pm-limit").textContent = "—";
    }
  }

  function updateDefense() {
    var armor = byId(ARMORS, val("equipped_armor"));
    var shield = byId(ARMORS, val("equipped_shield"));
    var race = currentRace();
    var dex = armor && armor.kind === "heavy" ? 0 : finalAttr("dex");
    var armorBonus = armor ? armor.defense : 0;
    var shieldBonus = shield ? shield.defense : 0;
    var racial = race ? race.defenseBonus || 0 : 0;
    var other = num("defense_other", 0);
    var total = 10 + dex + armorBonus + shieldBonus + racial + other;
    $("#defense-total").textContent = String(total);
    $("#defense-breakdown").textContent = "10" +
      (armor && armor.kind !== "heavy" ? " + DES " + signed(dex) : armor && armor.kind === "heavy" ? " (armadura pesada: sem DES)" : " + DES " + signed(dex)) +
      " + armadura " + signed(armorBonus) + " + escudo " + signed(shieldBonus) +
      (racial ? " + raça " + signed(racial) : "") + " + outros " + signed(other);
  }

  function renderSaves() {
    var root = $("#saves-grid");
    root.textContent = "";
    [["Fortitude","fort"],["Reflexos","reflex"],["Vontade","will"]].forEach(function (save) {
      var tile = el("div", "save-tile");
      tile.appendChild(el("span", "", save[0]));
      var value = el("strong", "", "+0");
      value.dataset.saveSkill = save[1];
      var button = el("button", "roll-button", "Rolar");
      button.type = "button";
      button.dataset.rollSkill = save[1];
      tile.append(value, button);
      root.appendChild(tile);
    });
  }
  function updateSaves() {
    $$("#saves-grid [data-save-skill]").forEach(function (node) {
      node.textContent = signed(skillValue(node.dataset.saveSkill));
    });
  }

  function getInventorySpaces() {
    return inventory.reduce(function (sum, item) {
      return sum + Math.max(0, Number(item.spaces) || 0) * Math.max(1, Number(item.quantity) || 1);
    }, 0);
  }
  function updateLoad() {
    var strength = Math.max(0, finalAttr("str"));
    var max = strength * 3;
    var lift = strength * 10;
    var used = getInventorySpaces();
    $("#load-max").textContent = max + " espaços";
    $("#load-max-side").textContent = String(max);
    $("#lift-max").textContent = lift + " espaços";
    $("#lift-max-side").textContent = String(lift);
    $("#load-used").textContent = String(used);
    $("#load-summary").textContent = used + " / " + max + " espaços";
    $("#load-warning").hidden = used <= max;
  }

  function updateDerived() {
    updateAttributeDisplays();
    updateSkillValues();
    updateSaves();
    updateResources();
    updateDefense();
    updateSpellMetrics();
    updateLoad();
    updateAttackStats();
  }

  function weaponProficient(weapon, attack) {
    if (attack && attack.proficientOverride) return true;
    if (weapon.category === "simple") return true;
    var meta = currentClass();
    return !!(meta && meta.prof && meta.prof.indexOf(weapon.category) >= 0);
  }
  function attackResult(attack) {
    var weapon = byId(WEAPONS, attack.weaponId);
    if (!weapon) return null;
    var skillId = weapon.mode === "ranged" ? "shoot" : "fight";
    var attackSkill = skillValue(skillId);
    if (weapon.dexAttack) attackSkill += Math.max(finalAttr("str"), finalAttr("dex")) - finalAttr("str");
    var bonus = attackSkill + (weaponProficient(weapon, attack) ? 0 : -5) + (Number(attack.other) || 0);
    var damageBonus = weapon.damageAttr ? finalAttr(weapon.damageAttr) : 0;
    var damage = weapon.damage === "—" ? "—" : weapon.damage + (weapon.damageAttr ? " " + signed(damageBonus) : "");
    if (attack.damageOther) damage += " " + attack.damageOther;
    return {weapon:weapon,skill:skillId,bonus:bonus,damage:damage};
  }
  function updateAttackStats() {
    attacks.forEach(function (attack, index) {
      var result = attackResult(attack);
      if (!result) return;
      var card = $('[data-attack-card="' + index + '"]');
      if (!card) return;
      $("[data-attack-stat='bonus']", card).textContent = signed(result.bonus);
      $("[data-attack-stat='damage']", card).textContent = result.damage + (result.weapon.damageType && result.weapon.damageType !== "—" ? " " + result.weapon.damageType : "");
      $("[data-attack-stat='prof']", card).textContent = weaponProficient(result.weapon, attack) ? "Proficiente" : "Sem proficiência · −5";
    });
  }

  function renderAttacks() {
    var root = $("#attacks-list");
    root.textContent = "";
    if (!attacks.length) {
      root.appendChild(el("div", "empty-state", "Nenhuma arma adicionada. Escolha uma arma do livro ou registre um ataque personalizado."));
      return;
    }
    attacks.forEach(function (attack, index) {
      var card = el("article", "item-card");
      card.dataset.attackCard = String(index);
      var head = el("div", "item-card-head");
      var title = el("strong", "item-card-title", attack.custom ? (attack.name || "Ataque personalizado") : (byId(WEAPONS, attack.weaponId) || {}).name || "Arma");
      var remove = el("button", "icon-button", "×");
      remove.type = "button";
      remove.dataset.removeAttack = String(index);
      remove.setAttribute("aria-label", "Remover ataque");
      head.append(title, remove);
      card.appendChild(head);
      if (attack.custom) {
        var customFields = el("div", "item-fields");
        customFields.append(
          createListField("Ataque", "number", attack.other || 0, "attack", index, "other"),
          createListField("Dano / tipo", "text", attack.damageOther || "", "attack", index, "damageOther"),
          createListField("Alcance / notas", "text", attack.notes || "", "attack", index, "notes")
        );
        card.appendChild(customFields);
        var customMeta = el("div", "item-meta", "Bônus informado manualmente; os valores não vêm do catálogo.");
        card.appendChild(customMeta);
      } else {
        var result = attackResult(attack);
        var details = el("div", "attack-stats");
        var bonus = el("strong", "", signed(result ? result.bonus : 0));
        bonus.dataset.attackStat = "bonus";
        var damage = el("strong", "", result ? result.damage + " " + result.weapon.damageType : "—");
        damage.dataset.attackStat = "damage";
        var prof = el("span", "item-meta", result && weaponProficient(result.weapon, attack) ? "Proficiente" : "Sem proficiência · −5");
        prof.dataset.attackStat = "prof";
        details.append(
          el("span", "attack-pill", "Ataque ").appendChild(bonus).parentElement,
          el("span", "attack-pill damage-pill", "Dano ").appendChild(damage).parentElement,
          prof,
          el("span", "item-meta", (result && result.weapon.critical ? "Crítico " + result.weapon.critical : "") + (result && result.weapon.range !== "—" ? " · " + result.weapon.range : ""))
        );
        card.appendChild(details);
        var controls = el("div", "item-fields");
        controls.append(
          createListField("Outros no ataque", "number", attack.other || 0, "attack", index, "other"),
          createListField("Bônus de dano", "text", attack.damageOther || "", "attack", index, "damageOther"),
          createListField("Observações", "text", attack.notes || (result && result.weapon.extra) || "", "attack", index, "notes")
        );
        card.appendChild(controls);
        if (result && result.weapon.category !== "simple") {
          var proficientLabel = el("label", "check-row");
          var profInput = el("input");
          profInput.type = "checkbox";
          profInput.checked = !!attack.proficientOverride;
          profInput.dataset.list = "attack";
          profInput.dataset.index = String(index);
          profInput.dataset.key = "proficientOverride";
          proficientLabel.append(profInput, el("span", "", "Tenho proficiência adicional"));
          card.appendChild(proficientLabel);
        }
      }
      root.appendChild(card);
    });
    updateAttackStats();
  }

  function createListField(labelText, type, value, listName, index, key) {
    var label = el("label", "field item-edit-field");
    label.appendChild(el("span", "", labelText));
    var input = el("input");
    input.type = type;
    input.value = value == null ? "" : String(value);
    input.dataset.list = listName;
    input.dataset.index = String(index);
    input.dataset.key = key;
    label.appendChild(input);
    return label;
  }

  function renderInventory() {
    var root = $("#inventory-list");
    root.textContent = "";
    if (!inventory.length) {
      root.appendChild(el("div", "empty-state", "Inventário vazio. Escolha um item do catálogo ou adicione algo personalizado."));
      updateLoad();
      return;
    }
    inventory.forEach(function (item, index) {
      var card = el("article", "item-card");
      var head = el("div", "item-card-head");
      head.appendChild(el("strong", "item-card-title", item.name || "Item"));
      head.appendChild(el("span", "item-meta", item.price !== undefined && item.price !== null ? "T$ " + item.price : ""));
      var remove = el("button", "icon-button", "×");
      remove.type = "button";
      remove.dataset.removeInventory = String(index);
      remove.setAttribute("aria-label", "Remover item");
      head.appendChild(remove);
      card.appendChild(head);
      var fields = el("div", "item-fields");
      fields.append(
        createListField("Espaços", "number", item.spaces || 0, "inventory", index, "spaces"),
        createListField("Quantidade", "number", item.quantity || 1, "inventory", index, "quantity"),
        createListField("Preço por unidade", "number", item.price || 0, "inventory", index, "price")
      );
      card.appendChild(fields);
      root.appendChild(card);
    });
    updateLoad();
  }

  function renderSpellCatalog() {
    var root = $("#spell-catalog");
    root.textContent = "";
    var query = $("#spell-search").value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    var type = $("#spell-type").value;
    var circle = $("#spell-circle").value;
    var meta = currentClass();
    var magic = magicInfo();
    var visible = SPELLS.filter(function (spell) {
      if (type !== "all" && spell.type !== type) return false;
      if (circle !== "all" && String(spell.circle) !== circle) return false;
      if (query) {
        var haystack = (spell.name + " " + spell.school + " " + spell.type + " " + spell.circle).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (haystack.indexOf(query) < 0) return false;
      }
      return true;
    });
    if (!visible.length) {
      root.appendChild(el("div", "empty-state", "Nenhuma magia encontrada."));
      return;
    }
    visible.slice(0, 60).forEach(function (spell) {
      var button = el("button", "spell-catalog-item");
      button.type = "button";
      button.dataset.addSpell = spell.id;
      var name = el("strong", "", spell.name);
      var tag = el("span", "", spell.circle + "º · " + spell.school + " · " + (spell.type === "arcana" ? "Arcana" : "Divina"));
      button.append(name, tag);
      var locked = !!(meta && meta.magic && spell.type !== meta.magic) ||
        !!(magic && maxMagicCircle() > 0 && spell.circle > maxMagicCircle());
      if (locked) {
        button.disabled = true;
        button.title = meta && meta.magic && spell.type !== meta.magic ? "Tipo de magia não habilitado por esta classe." : "Círculo ainda não liberado pelo nível.";
      }
      root.appendChild(button);
    });
    if (visible.length > 60) root.appendChild(el("div", "empty-state", "Mostrando 60 de " + visible.length + " resultados. Refine a busca."));
  }

  function addSpell(spell) {
    if (!spell) return;
    if (knownSpells.some(function (item) { return item.catalogId === spell.id; })) {
      showToast("Essa magia já está na ficha.");
      return;
    }
    knownSpells.push({
      id:"spell-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
      catalogId:spell.id,name:spell.name,type:spell.type,circle:spell.circle,school:spell.school,
      cost:"",execution:"",range:"",duration:"",resistance:"",notes:""
    });
    renderKnownSpells();
    save();
    showToast("Magia adicionada à ficha.");
  }

  function renderKnownSpells() {
    var root = $("#known-spells");
    root.textContent = "";
    $("#spell-count").textContent = knownSpells.length + (knownSpells.length === 1 ? " magia" : " magias");
    if (!knownSpells.length) {
      root.appendChild(el("div", "empty-state", "Nenhuma magia adicionada. Use a busca do catálogo para escolher."));
      return;
    }
    knownSpells.forEach(function (spell, index) {
      var card = el("article", "spell-card");
      var head = el("div", "spell-card-head");
      head.appendChild(el("strong", "", spell.name));
      var tags = el("span", "spell-card-tags");
      tags.append(
        el("span", "tag", spell.type === "arcana" ? "Arcana" : "Divina"),
        el("span", "tag", spell.circle + "º círculo"),
        el("span", "tag", spell.school)
      );
      head.appendChild(tags);
      var remove = el("button", "icon-button", "×");
      remove.type = "button";
      remove.dataset.removeSpell = String(index);
      remove.setAttribute("aria-label", "Remover magia");
      head.appendChild(remove);
      card.appendChild(head);
      var fields = el("div", "spell-fields");
      [
        ["Custo PM","cost"],["Execução","execution"],["Alcance","range"],["Duração","duration"],["Resistência","resistance"]
      ].forEach(function (def) {
        var label = el("label", "field");
        label.appendChild(el("span", "", def[0]));
        var input = el("input");
        input.type = "text";
        input.value = spell[def[1]] || "";
        input.dataset.spellIndex = String(index);
        input.dataset.spellKey = def[1];
        label.appendChild(input);
        fields.appendChild(label);
      });
      card.appendChild(fields);
      var notes = el("label", "field spell-notes");
      notes.appendChild(el("span", "", "Anotações"));
      var textarea = el("textarea");
      textarea.rows = 2;
      textarea.value = spell.notes || "";
      textarea.dataset.spellIndex = String(index);
      textarea.dataset.spellKey = "notes";
      notes.appendChild(textarea);
      card.appendChild(notes);
      root.appendChild(card);
    });
  }

  function renderPowers() {
    var root = $("#powers-list");
    root.textContent = "";
    if (!powers.length) {
      root.appendChild(el("div", "empty-state", "Nenhum poder registrado manualmente."));
      return;
    }
    powers.forEach(function (power, index) {
      var card = el("article", "item-card");
      var head = el("div", "item-card-head");
      head.appendChild(el("strong", "item-card-title", power.name || "Habilidade"));
      head.appendChild(el("span", "item-meta", power.source || ""));
      var remove = el("button", "icon-button", "×");
      remove.type = "button";
      remove.dataset.removePower = String(index);
      remove.setAttribute("aria-label", "Remover habilidade");
      head.appendChild(remove);
      card.appendChild(head);
      root.appendChild(card);
    });
  }

  function stateFields() {
    var fields = {};
    $$("input[name],textarea[name],select[name]").forEach(function (input) {
      fields[input.name] = input.type === "checkbox" ? input.checked : input.value;
    });
    return fields;
  }
  function collectState() {
    return {version:1,fields:stateFields(),attacks:attacks,inventory:inventory,powers:powers,knownSpells:knownSpells};
  }
  function applyFields(fields) {
    Object.keys(fields || {}).forEach(function (name) {
      var input = byName(name);
      if (!input) return;
      if (input.type === "checkbox") input.checked = !!fields[name];
      else input.value = fields[name];
    });
  }
  function applyState(data) {
    if (!data || typeof data !== "object") return;
    applyFields(data.fields || {});
    attacks = Array.isArray(data.attacks) ? data.attacks : [];
    inventory = Array.isArray(data.inventory) ? data.inventory : [];
    powers = Array.isArray(data.powers) ? data.powers : [];
    knownSpells = Array.isArray(data.knownSpells) ? data.knownSpells : [];
    updateRaceControls(false);
    classChoices();
    renderOriginBenefits(false);
    renderSkills();
    applyFields(data.fields || {});
    renderSkills();
    renderClassTrack();
    renderAttacks();
    renderInventory();
    renderPowers();
    renderKnownSpells();
    renderSpellCatalog();
    updateDerived();
  }
  function save() {
    clearTimeout(saveTimer);
    $("#save-status").textContent = "Salvando…";
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(collectState()));
        $("#save-status").textContent = "Salvo neste dispositivo";
      } catch (error) {
        $("#save-status").textContent = "Armazenamento indisponível";
      }
    }, 180);
  }

  function onStaticChange(target) {
    if (target.name === "race") {
      updateRaceControls(true);
      renderSkills();
    }
    if (target.name === "race_variant" || target.name.indexOf("race_flex_") === 0 || target.name.indexOf("race_skill_") === 0) {
      if (target.name.indexOf("race_flex_") === 0) updateRaceControls(false);
      renderSkills();
    }
    if (target.name === "class") {
      classChoices();
      renderSkills();
      renderSpellCatalog();
      cachedTrackKey = "";
      renderClassTrack();
      var meta = currentClass();
      if (meta) {
        updateResources();
        if (num("pv_current") === 0) setVal("pv_current", $("#pv-max").textContent);
        if (num("pm_current") === 0) setVal("pm_current", $("#pm-max").textContent);
      }
    }
    if (target.name.indexOf("class_choice_") === 0) renderSkills();
    if (target.name === "origin") {
      renderOriginBenefits(true);
      renderSkills();
    }
    if (target.name === "origin_benefit_1" || target.name === "origin_benefit_2") renderSkills();
    if (target.name === "level") {
      var levelValue = currentLevel();
      if (target.value !== String(levelValue)) target.value = String(levelValue);
      cachedTrackKey = "";
      renderClassTrack();
      renderSkills();
      renderSpellCatalog();
    }
    if (target.name === "spell-type") {
      target.dataset.touched = "1";
      renderSpellCatalog();
    }
    if (target.name === "spell-circle" || target.id === "spell-search") renderSpellCatalog();
    updateDerived();
    if (target.name === "class" || target.name === "level" || target.name === "class_path") renderSpellCatalog();
    save();
  }

  function handleListField(target) {
    if (target.dataset.list === "attack") {
      var attack = attacks[Number(target.dataset.index)];
      if (!attack) return;
      attack[target.dataset.key] = target.type === "checkbox" ? target.checked : target.value;
      updateAttackStats();
      save();
    } else if (target.dataset.list === "inventory") {
      var item = inventory[Number(target.dataset.index)];
      if (!item) return;
      item[target.dataset.key] = target.value;
      updateLoad();
      save();
    } else if (target.dataset.spellIndex !== undefined) {
      var spellItem = knownSpells[Number(target.dataset.spellIndex)];
      if (!spellItem) return;
      spellItem[target.dataset.spellKey] = target.value;
      save();
    }
  }

  function addCustomAttack() {
    var name = $("#custom-attack-name").value.trim();
    var damage = $("#custom-attack-damage").value.trim();
    if (!name) { showToast("Dê um nome ao ataque."); return; }
    attacks.push({custom:true,name:name,other:0,damageOther:damage,notes:""});
    $("#custom-attack-name").value = "";
    $("#custom-attack-damage").value = "";
    renderAttacks();
    save();
  }
  function addCatalogWeapon() {
    var weapon = byId(WEAPONS, $("#weapon-picker").value);
    if (!weapon) { showToast("Escolha uma arma."); return; }
    attacks.push({weaponId:weapon.id,other:0,damageOther:"",notes:"",proficientOverride:false});
    renderAttacks();
    save();
  }
  function addCatalogItem() {
    var selected = $("#item-picker").value;
    if (!selected) { showToast("Escolha um item."); return; }
    var parts = selected.split(":");
    var entry = parts[0] === "weapon" ? byId(WEAPONS, parts[1]) : parts[0] === "armor" ? byId(ARMORS, parts[1]) : byId(GENERAL_ITEMS, parts[1]);
    if (!entry) return;
    inventory.push({name:entry.name,spaces:entry.spaces || 0,quantity:1,price:entry.price || 0,source:parts[0]});
    renderInventory();
    updateLoad();
    save();
  }
  function addCustomItem() {
    var name = $("#custom-item-name").value.trim();
    if (!name) { showToast("Dê um nome ao item."); return; }
    inventory.push({name:name,spaces:Number($("#custom-item-spaces").value) || 0,quantity:1,price:0,source:"custom"});
    $("#custom-item-name").value = "";
    renderInventory();
    updateLoad();
    save();
  }
  function addPower() {
    var name = $("#power-name").value.trim();
    if (!name) { showToast("Dê um nome à habilidade."); return; }
    powers.push({name:name,source:$("#power-source").value.trim()});
    $("#power-name").value = "";
    $("#power-source").value = "";
    renderPowers();
    save();
  }

  function saveDownload() {
    var blob = new Blob([JSON.stringify(collectState(), null, 2)], {type:"application/json"});
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    var name = val("character_name", "personagem").trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "personagem";
    anchor.href = url;
    anchor.download = "tormenta20-" + name.toLowerCase() + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Cópia JSON exportada.");
  }

  function importFile(file) {
    if (!file) return;
    file.text().then(function (text) {
      var data = JSON.parse(text);
      if (!data || typeof data !== "object" || !data.fields) throw new Error("Arquivo de ficha inválido.");
      applyState(data);
      save();
      showToast("Ficha importada.");
    }).catch(function () { showToast("Não foi possível importar esse arquivo JSON."); });
  }

  function resetSheet() {
    if (!window.confirm("Apagar a ficha salva neste navegador e começar outra?")) return;
    try { localStorage.removeItem(STORE_KEY); } catch (error) {}
    window.location.reload();
  }

  function handleClick(event) {
    var target = event.target.closest("button");
    if (!target) return;
    if (target.classList.contains("tab")) {
      $$(".tab").forEach(function (tab) { tab.classList.toggle("active", tab === target); });
      $$(".pane").forEach(function (pane) { pane.classList.toggle("active", pane.id === "pane-" + target.dataset.tab); });
      return;
    }
    if (target.id === "export-button") { saveDownload(); return; }
    if (target.id === "import-button") { $("#import-file").click(); return; }
    if (target.id === "print-button") { window.print(); return; }
    if (target.id === "reset-button") { resetSheet(); return; }
    if (target.id === "add-weapon") { addCatalogWeapon(); return; }
    if (target.id === "add-custom-attack") { addCustomAttack(); return; }
    if (target.id === "add-item") { addCatalogItem(); return; }
    if (target.id === "add-custom-item") { addCustomItem(); return; }
    if (target.id === "add-power") { addPower(); return; }
    if (target.dataset.rollSkill) {
      var die = Math.floor(Math.random() * 20) + 1;
      var total = die + skillValue(target.dataset.rollSkill);
      var meta = skill(target.dataset.rollSkill);
      showToast((meta ? meta.name : "Teste") + ": d20 " + die + " " + (total - die >= 0 ? "+ " : "− ") + Math.abs(total - die) + " = " + total);
      return;
    }
    if (target.dataset.addSpell) {
      addSpell(SPELLS.find(function (spell) { return spell.id === target.dataset.addSpell; }));
      return;
    }
    if (target.dataset.removeAttack !== undefined) {
      attacks.splice(Number(target.dataset.removeAttack), 1);
      renderAttacks(); save(); return;
    }
    if (target.dataset.removeInventory !== undefined) {
      inventory.splice(Number(target.dataset.removeInventory), 1);
      renderInventory(); save(); return;
    }
    if (target.dataset.removePower !== undefined) {
      powers.splice(Number(target.dataset.removePower), 1);
      renderPowers(); save(); return;
    }
    if (target.dataset.removeSpell !== undefined) {
      knownSpells.splice(Number(target.dataset.removeSpell), 1);
      renderKnownSpells(); save();
    }
  }

  function handleInput(event) {
    var target = event.target;
    if (target.id === "spell-search") {
      renderSpellCatalog();
      return;
    }
    if (target.dataset.list || target.dataset.spellIndex !== undefined) {
      if (target.type === "checkbox") return;
      handleListField(target);
      return;
    }
    if (target.name && target.type === "checkbox") return;
    if (target.name === "class_path") renderSpellCatalog();
    updateDerived();
    save();
  }

  function handleChange(event) {
    var target = event.target;
    if (target.id === "import-file") {
      importFile(target.files && target.files[0]);
      target.value = "";
      return;
    }
    if (target.dataset.list || target.dataset.spellIndex !== undefined) {
      handleListField(target);
      return;
    }
    if (target.name === "class_path") renderSpellCatalog();
    onStaticChange(target);
  }

  function loadSavedState() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (error) {}
    if (!raw) return false;
    try {
      applyState(JSON.parse(raw));
      return true;
    } catch (error) {
      showToast("A ficha salva não pôde ser lida; uma nova ficha foi aberta.");
      return false;
    }
  }

  function init() {
    populateDataSelects();
    makeAttributes();
    createHumanSkillControls();
    setVal("race", "humano");
    setVal("class", "");
    setVal("origin", "");
    setVal("race_flex_1", "str");
    setVal("race_flex_2", "dex");
    setVal("race_flex_3", "con");
    updateRaceControls(false);
    classChoices();
    renderOriginBenefits(true);
    renderSkills();
    renderClassTrack();
    renderSaves();
    renderAttacks();
    renderInventory();
    renderPowers();
    renderKnownSpells();
    renderSpellCatalog();
    updateDerived();
    loadSavedState();
    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleChange);
    $("#spell-search").addEventListener("input", renderSpellCatalog);
    $("#spell-type").addEventListener("change", function () {
      $("#spell-type").dataset.touched = "1";
      renderSpellCatalog();
      save();
    });
    $("#spell-circle").addEventListener("change", function () { renderSpellCatalog(); });
  }

  init();
})();
