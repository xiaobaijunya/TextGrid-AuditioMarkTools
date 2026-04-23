﻿// 读取TextGrid文件并写入AU标记（简化版）
var filePath = app.activeDocument.path;
var wavname = app.activeDocument.displayName;
var dirPath = filePath.split('\\').slice(0, -1).join('\\');

// 查找TextGrid文件
var textgridFile = new File(dirPath + "/" + wavname + ".TextGrid");
if (!textgridFile.exists) {
    alert("未找到对应的TextGrid文件：" + textgridFile.fsName, "错误");
}

// 读取TextGrid内容
textgridFile.open("r");
textgridFile.encoding = "UTF-8";
var content = textgridFile.read();
textgridFile.close();

// 解析TextGrid文件 - 只读取phones tier的xmin和text
var lines = content.split("\n");
var markers = [];
var currentTier = "";
var inPhonesTier = false;
var currentInterval = {};

for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    
    // 检测tier
    if (line.indexOf('name = "phones"') !== -1) {
        inPhonesTier = true;
        currentTier = "phones";
    } else if (line.indexOf('name = "words"') !== -1) {
        inPhonesTier = false;
        currentTier = "words";
    }
    
    // 只在phones tier中处理
    if (inPhonesTier) {
        if (line.indexOf("intervals [") !== -1) {
            // 新的interval开始，保存前一个
            if (currentInterval.xmin !== undefined && currentInterval.text !== undefined) {
                markers.push(currentInterval);
            }
            currentInterval = {};
        } else if (line.indexOf("xmin =") !== -1) {
            currentInterval.xmin = parseFloat(line.split("=")[1]);
        } else if (line.indexOf("text =") !== -1) {
            var textMatch = line.match(/text = "(.*)"/);
            if (textMatch) {
                currentInterval.text = textMatch[1];
            }
        }
    }
}

// 处理最后一个interval
if (currentInterval.xmin !== undefined && currentInterval.text !== undefined) {
    markers.push(currentInterval);
}

// 转换为AU标记（使用xmin作为标记位置，持续时间为0）
var sampleRate = app.activeDocument.sampleRate;
var newDefs = [];

for (var j = 0; j < markers.length; j++) {
    var marker = markers[j];
    var start = Math.round(marker.xmin * sampleRate);
    
    var def = {
        start: start,
        duration: 0,  // 普通标记点，持续时间为0
        name: marker.text,
        type: "Cue",
        description: ""
    };
    newDefs.push(def);
}

// 删除现有标记
if (app.invokeCommand(Application.COMMAND_EDIT_DELETEALLMARKERS)) {
    $.writeln('删除所有现有标记');
}

// 添加新标记
for (var k = 0; k < newDefs.length; k++) {
    var d = newDefs[k];
    app.activeDocument.addMarker(d.start, d.duration, d.name, d.type);
}

alert("成功导入 " + markers.length + " 个标记点", "TextGrid导入完成");