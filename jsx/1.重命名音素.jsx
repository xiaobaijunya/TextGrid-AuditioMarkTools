// 删除所有标记
var markers = app.activeDocument.markers;
var newDefs = [];
var filePath = app.activeDocument.path;
var wavname = app.activeDocument.displayName;
var dirPath = filePath.split('\\').slice(0, -1).join('\\');
// 新增CSV读取逻辑
var csvFile = new File(dirPath + "/transcriptions.csv");
var newname = [];


if (csvFile.exists) {
    csvFile.open("r");
    var csvContent = csvFile.read();
    csvFile.close();
    
    // 解析CSV内容[6,7](@ref)
    var lines = csvContent.split("\n");
    var headers = lines[0].split(",");
                
    for (var i = 1; i < lines.length; i++) {
        var row = lines[i].split(",");   
        if (row[0] === wavname) {
            $.writeln (row[1])
            // 获取ph_seq并分割为数组[3,8](@ref)
            newname = row[1].split(" ");

            break;
        }
    }
}

// 错误处理
if (newname.length === 0) {
    alert("未在CSV中找到匹配的音素序列", "错误");
}

if (markers.length != newname.length) {
    alert("音素数量：" + newname.length + " 标记数量：" + markers.length, '音素数量不匹配');
}

// 标记重命名逻辑（保持原有）
for (var i = 0; i < markers.length; i++) {
    var m = markers[i];
    var def = {
        start: m.start,
        duration: m.length,
        name: (i < newname.length) ? newname[i] : m.name,
        type: m.type,
        description: m.description
    };
    newDefs.push(def);
};

// 删除并重建标记（保持原有）
if (app.invokeCommand(Application.COMMAND_EDIT_DELETEALLMARKERS)) {
    $.writeln('删除所有标记');
}

for (var k = 0; k < newDefs.length; k++) {
    var d = newDefs[k];
    app.activeDocument.addMarker(d.start, d.duration, d.name, d.type);
}
alert("重命名成功\n", '重命名完成');


