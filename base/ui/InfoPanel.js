/*
 * CPUFreq Manager - a lightweight CPU frequency scaling monitor
 * and powerful CPU management tool
 *
 * Copyright (C) 2016-2018 konkor <github.com/konkor>
 *
 * This file is part of CPUFreq Manager.
 *
 * CPUFreq Manager is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CPUFreq Manager is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Convenience = imports.convenience;
const byteArrayToString = Convenience.byteArrayToString;
const Helper = imports.base.HelperCPUFreq;

let cpucount = Convenience.get_cpu_number ();

var InfoPanel = new Lang.Class({
  Name: "InfoPanel",
  Extends: Gtk.Box,

  _init: function () {
    this.parent ({orientation:Gtk.Orientation.VERTICAL,margin:8});
    this.border = 8;
    this.get_style_context ().add_class ("info-widget");

    this._cpuname = new Gtk.Label ({label:this.cpu_name, use_markup:true, xalign:0, margin:8});
    this.add (this._cpuname);

    this._linux = new Gtk.Label ({label:this.linux_kernel, use_markup:true, xalign:0, margin:8});
    this.add (this._linux);

    this.corebox = new  Gtk.FlowBox ({
      homogeneous: true,
      activate_on_single_click: false,
      max_children_per_line: 4,
      valign: Gtk.Align.START,
      margin_top: 16,
      selection_mode: Gtk.SelectionMode.NONE
    });
    if (cpucount < 4) this.corebox.max_children_per_line = cpucount;
    this.pack_start (this.corebox, false, true, 0);

    this.cores = [];
    for (let i=0; i < cpucount; i++) {
      let core = new CoreInfo (i);
      this.corebox.add (core);
      this.cores.push (core);
    }
  },

  get cpu_name () {
    let f = Gio.File.new_for_path ('/proc/cpuinfo');
    if (f.query_exists(null)) {
      let dis = new Gio.DataInputStream ({ base_stream: f.read (null) });
      let line, model = "", s, i = 0;
      try {
        [line, ] = dis.read_line (null);
        while (line != null) {
          s = byteArrayToString(line).toString();
          if (s.indexOf ("model name") > -1) {
            model = s;
            i++;
          }
          if (i > 0) break;
          [line, ] = dis.read_line (null);
        }
        dis.close (null);
        if (model) {
          model = model.substring (model.indexOf (":") + 1).trim ();
          if (model.lastIndexOf ("@") > -1)
            model = model.substring (0, model.lastIndexOf ("@")).trim ();
          model = model.replace ("(R)", "®");
          model = model.replace ("(TM)", "™");
          s = model; model = "";
          s.split (" ").forEach ((f)=>{
            if (f.length > 0) model += f + " ";
          });
          return model.trim ().toString ();
        }
      } catch (e) {
        print ("Get CPU Error:", e.message);
      }
    }
    return "unknown processor";
  },

  get linux_kernel () {
    let distro = "GNU/Linux ";
    let f = Gio.File.new_for_path ('/etc/os-release');
    if (f.query_exists (null)) {
      let dis = new Gio.DataInputStream ({ base_stream: f.read (null) });
      let line, model = "", s, i = 0;
      try {
        [line, ] = dis.read_line (null);
        while (line != null) {
          s = byteArrayToString(line).toString();
          if (s.indexOf ("PRETTY_NAME=") > -1) {
            model = s;
            i++;
          }
          if (i > 0) break;
          [line, ] = dis.read_line (null);
        }
        dis.close (null);
        if (model) {
          if (model.length > 11) model = model.substring (12).trim ();
          model = model.replace (/\"/g, "");
          model = model.replace (distro, "");
          i = model.indexOf ('(');
          if ((i > -1) && (model.length > (i+1))) {
            model = model.slice(0,i) + model[i+1].toUpperCase() + model.slice(i+2);
            model = model.replace (")", "");
          }
          distro = model;
        }
      } catch (e) {
        print ("Get Release Error:", e.message);
      }
    }
    let kernel_version = Helper.get_info_string ("uname -r");
    if (kernel_version) {
      distro += "\nKernel " + kernel_version;
    }
    return distro;
  }
});


var CoreInfo = new Lang.Class({
  Name: "CoreInfo",
  Extends: Gtk.Box,

  _init: function (num) {
    this.core = num || 0;
    this.parent ({orientation:Gtk.Orientation.VERTICAL});
    //this.get_style_context ().add_class ("info-widget");

    this.cpulabel = new Gtk.Label ({label:"cpu" + this.core, xalign:0.5, margin_top:0});
    this.add (this.cpulabel);

    this.freqlabel = new Gtk.Label ({label:"---", xalign:0.5, margin_top:0});
    this.add (this.freqlabel);

    this.update ();
  },

  update: function () {
    this.get_frequency ();
  },

  get_frequency: function () {
    Helper.get_frequency_async (this.core, Lang.bind (this, (label) => {
      this.freqlabel.set_text (label);
    }));
  }
});