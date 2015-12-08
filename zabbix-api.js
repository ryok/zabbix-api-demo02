var authid;

//表示するグラフ
//typeはitemのvalue_typeに合わせる。0:float,3:???
var graphs = [
  {label:'LA5'      , filter:{key_:'system.cpu.load[,avg5]'},    type:0},
  {label:'Mem Avail', filter:{key_:'vm.memory.size[available]'}, type:3},
];

function getValues(arr, key){
  return $.map(arr, function(obj){
    return obj[key];
  });
}

function callAPI(method, params, async, success, error) {
  var url  = 'http://192.168.1.10/zabbix/api_jsonrpc.php'; //環境に合わせる

  var sendData = {
    jsonrpc: '2.0',
    id:      1,
    auth:    authid,
    method:  method,
    params:  params,
  }

  $.ajax({
    url:          url,
    contentType: 'application/json-rpc',
    dataType:    'json',
    type:        'POST',
    processData: false,
    data:        JSON.stringify(sendData),
    async:       async,
    success:     success,
    error:       error,
  });
};

function getAPIResponse(method, params, async, callback){
  callAPI(method, params, async,
    function(response){
      if(response['error']){
        alert("API Error:" + JSON.stringify(response));
      }else{
        callback(response['result']);
      }
    },
    function(response){
      alert("Connect Error:" + JSON.stringify(response));
    }
  );
}

function authAPI() {
  var user     = 'admin';    //adminとか絶対やめましょうね！！！
  var password = 'zabbix';   //

  authid = null;
  getAPIResponse(
    'user.authenticate',
    {"user":user, "password":password},
    false,
    function(result){
        authid = result;
    }
  );
}

function initHostGroup(){
  getAPIResponse(
    'hostgroup.get',
    {output: "extend"},
    true,
    function(hostgroups){
      $.each(hostgroups, function(idx, obj){
        $('#hostgrouplist')
          .append($('<input></input>').attr({type:'checkbox', value:obj.groupid}))
          .append($('<label></label>').text(obj.name));

        if((idx+1) % 5 == 0){$('#hostgrouplist').append($('<br/>'));}
      });

    }
  );

};

function updateHost(){
  $('#hostlist').empty();

  var groupids = $('#hostgrouplist>input:checked').map(function(){
    return $(this).val();
  }).get();

  getAPIResponse(
    'host.get',
    {groupids:groupids, output:"extend", sortfield:"host"},
    true,
    function(hosts){
      $.each(hosts, function(idx, h){
        $('#hostlist')
          .append($('<input></input>')
            .attr({type:'checkbox', name:h.host, value:h.hostid}))
          .append($('<label></label>').text(h.host))
          .append($('<br/>'));
      });
    }
  );
}


function updateGraph(){
  var hosts = [];
  var now = parseInt((new Date)/1000);

  $('#hostlist>input:checked').each(function(){
    hosts.push({name:this.name, id:this.value});
  });

  $('#graph').empty();
  for(var i in hosts){
    for(var j in graphs){
      $('#graph').append($('<img/>').attr('id', "graph-"+i+"-"+j));
      if(j == graphs.length - 1){
        $('#graph').append($('<br/>'));
      }
    }
  }

  for(var i in hosts){
    host = hosts[i];
    for(var j in graphs){
      graph = graphs[j];

      getAPIResponse(
        'item.get',
        {hostids:[host.id], filter:graph.filter},
        false,
        function(result){
          itemid = result[0].itemid;

          getAPIResponse(
            'history.get',
            {
              history:   graph.type,
              itemids:   [itemid],
              output:    "extend",
              time_from: now - 86400,
              time_till: now,
              limit:     288
            },
            false,
            function(result){
              $("#graph-"+i+"-"+j).attr('src', createChartURL(
                 host.name +":"+ graph.label,getValues(result, 'value')));
            }
          );

        }
      );
    }
  }
}

function createChartURL(label, data){
  max = Math.ceil(Math.max.apply(null, data));
  for(i in data){
    data[i] = parseInt(data[i] * 100 / max);
  }

  var url = "http://chart.apis.google.com/chart"
    + "?cht=lc"
    + "&chs=300x180"
    + "&chtt=" + label
    + "&chxt=y"
    + "&chxr=0,0," + max
    + "&chd=t:" + data.join();

  return url;
}

$(document).ready(function(){
    $('#hostgroupbtn').click(updateHost);
    $('#hostbtn').click(updateGraph);

    authAPI();
    initHostGroup();
});
