
以下是每个api返回的字段的具体结构

https://api.bilibili.com/x/relation/followings?vmid=196356191&
pn=1&ps=2&order=desc

获取指定用户关注的up数据列表
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "list": [
      {
        "mid": 49442838,    需要
        "attribute": 2,
        "mtime": 1774195299,
        "tag": null,
        "special": 0,
        "contract_info": {
        },
        "uname": "格历奇GLITCH",    需要
        "face": "https://i0.hdslb.com/bfs/face/06ea197a6b245ff730c8d9abd684abdff3193ef3.jpg",   需要
        "sign": "Glitch Productions是一家澳洲独立动画工作室, 此账号为BiliBili官方账号,请B站小伙伴多多支持！",
        "face_nft": 0,
        "handle": "",
        "official_verify": {
          "type": 0,
          "desc": "GLITCH官方账号"
        },...


https://api.bilibili.com/x/tag/archive/tags?bvid=BV1eMAGzjE55
获取指定视频的tag信息
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": [
    {
      "tag_id": 47282,  需要
      "tag_name": "日本料理", 需要
      "cover": "",
      "head_cover": "",
      "content": "",
      "short_content": "",
      "type": 3,
      "state": 0,
      "ctime": 1436866637,
      "count": {
        "view": 0,
        "use": 0,
        "atten": 0
      },
      "is_atten": 0,
      "likes": 0,
      "hates": 0,
      "attribute": 0,
      "liked": 0,
      "hated": 0,
      "extra_attr": 0
    }...后面都是这个元素



https://api.bilibili.com/x/space/acc/info?mid=355536702
获取指定up的详细信息

{
  "code": 0,
  "message": "OK",
  "ttl": 1,
  "data": {
    "mid": 355536702,   需要
    "name": "是灵梦哟", 需要
    "sex": "保密",
    "face": "https://i0.hdslb.com/bfs/face/ 22e99e43035c469b1ecd1be75bd3634f3e584316.jpg",  需要
    "face_nft": 0,
    "face_nft_type": 0,
    "sign": "不定期画画，偶尔会尝试制作烤肉（仅限绘画相关", 需要
    ...不重要的数据省略了

https://api.bilibili.com/x/web-interface/nav
可以获取和我相关的数据,但应该需要配合cookie才能正常获取到,没有任何参数,暂时不没有实际用处
{
  "code": 0,
  "message": "OK",
  "ttl": 1,
  "data": {
    "isLogin": true,
    "email_verified": 1,
    "face": "https://i0.hdslb.com/bfs/face/22e99e43035c469b1ecd1be75bd3634f3e584316.jpg",
    "face_nft": 0,
    "face_nft_type": 0,
    "level_info": {
      "current_level": 6,
      "current_min": 28800,
      "current_exp": 38592,
      "next_exp": "--"
    },
    "mid": 355536702,
    "mobile_verified": 1,
    "money": 550.8,
    "moral": 70,
    "official": {
      "role": 0,
      "title": "",
      "desc": "",
      "type": -1
    },
    "officialVerify": {
      "type": -1,
      "desc": ""
    },
    "pendant": {
      "pid": 0,
      "name": "",
      "image": "",
      "expire": 0,
      "image_enhance": "",
      "image_enhance_frame": "",
      "n_pid": 0
    },
    "scores": 0,
    "uname": "是灵梦哟",
    "vipDueDate": 1644249600000,
    "vipStatus": 0,
    "vipType": 1,
    "vip_pay_type": 0,
    "vip_theme_type": 0,
    "vip_label": {
      "path": "",
      "text": "",
      "label_theme": "",
      "text_color": "",
      "bg_style": 0,
      "bg_color": "",
      "border_color": "",
      "use_img_label": true,
      "img_label_uri_hans": "",
      "img_label_uri_hant": "",
      "img_label_uri_hans_static": "https://i0.hdslb.com/bfs/vip/d7b702ef65a976b20ed854cbd04cb9e27341bb79.png",
      "img_label_uri_hant_static": "https://i0.hdslb.com/bfs/activity-plat/static/20220614/e369244d0b14644f5e1a06431e22a4d5/KJunwh19T5.png",
      "label_id": 0,
      "label_goto": null
    },
    "vip_avatar_subscript": 0,
    "vip_nickname_color": "",
    "vip": {
      "type": 1,
      "status": 0,
      "due_date": 1644249600000,
      "vip_pay_type": 0,
      "theme_type": 0,
      "label": {
        "path": "",
        "text": "",
        "label_theme": "",
        "text_color": "",
        "bg_style": 0,
        "bg_color": "",
        "border_color": "",
        "use_img_label": true,
        "img_label_uri_hans": "",
        "img_label_uri_hant": "",
        "img_label_uri_hans_static": "https://i0.hdslb.com/bfs/vip/d7b702ef65a976b20ed854cbd04cb9e27341bb79.png",
        "img_label_uri_hant_static": "https://i0.hdslb.com/bfs/activity-plat/static/20220614/e369244d0b14644f5e1a06431e22a4d5/KJunwh19T5.png",
        "label_id": 0,
        "label_goto": null
      },
      "avatar_subscript": 0,
      "nickname_color": "",
      "role": 0,
      "avatar_subscript_url": "",
      "tv_vip_status": 0,
      "tv_vip_pay_type": 0,
      "tv_due_date": 0,
      "avatar_icon": {
        "icon_resource": {

        }
      },
      "ott_info": {
        "vip_type": 0,
        "pay_type": 0,
        "pay_channel_id": "",
        "status": 0,
        "overdue_time": 0
      },
      "super_vip": {
        "is_super_vip": false
      }
    },
    "wallet": {
      "mid": 355536702,
      "bcoin_balance": 0,
      "coupon_balance": 0,
      "coupon_due_time": 0
    },
    "has_shop": false,
    "shop_url": "",
    "answer_status": 0,
    "is_senior_member": 0,
    "wbi_img": {
      "img_url": "https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png",
      "sub_url": "https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png"
    },
    "is_jury": false,
    "name_render": null,
    "legal_region": "CN",
    "ip_region": "CN"
  }
}

https://api.bilibili.com/x/web-interface/view?bvid=BV1eMAGzjE55
获取指定视频的详细信息
{
  "code": 0,
  "message": "OK",
  "ttl": 1,
  "data": {
    "bvid": "BV1eMAGzjE55", 需要
    "aid": 116272582892485,  
    "videos": 1,
    "tid": 213,         
    "tid_v2": 2151,
    "tname": "",
    "tname_v2": "",
    "copyright": 1,
    "pic": "http://i0.hdslb.com/bfs/archive/64f083e50e02468823aedba338499d5ff782b915.jpg",  需要
    "title": "搞点日料店里的预制菜尝尝",    需要
    "pubdate": 1774179130,  需要
    "ctime": 1774179130,
    "desc": "",
    "desc_v2": null,
    "state": 0,
    "duration": 356,
    "rights": {
      "bp": 0,
      "elec": 0,
      "download": 1,
      "movie": 0,
      "pay": 0,
      "hd5": 0,
      "no_reprint": 1,
      "autoplay": 1,
      "ugc_pay": 0,
      "is_cooperation": 0,
      "ugc_pay_preview": 0,
      "no_background": 0,
      "clean_mode": 0,
      "is_stein_gate": 0,
      "is_360": 0,
      "no_share": 0,
      "arc_pay": 0,
      "free_watch": 0
    },
    "owner": {              这三个都需要
      "mid": 196356191,
      "name": "翔翔大作战",
      "face": "https://i2.hdslb.com/bfs/face/2834cc59f3bf789d8b5d02c741eeaaebc52f1659.jpg"
    },
    ...剩下的数据不重要省略

https://api.bilibili.com/x/web-interface/archive/stat?bvid=BV1eMAGzjE55
失效api

https://api.bilibili.com/x/web-interface/archive/related?bvid=BV1eMAGzjE55
获取当前视频的推荐视频列表
{
  "code": 0,
  "data": [
    {
      "aid": 113990495701381,
      "videos": 1,
      "tid": 213,
      "tname": "美食测评",
      "copyright": 1,
      "pic": "http://i1.hdslb.com/bfs/archive/e58333a09e93d04e5d43af55f72056eb1c6de010.jpg",
      "title": "《离谱预制菜》日料篇",
      "pubdate": 1739611800,
      "ctime": 1739357562,
      "desc": "三连吗\n谢谢",
      "state": 0,
      "duration": 268,
      "mission_id": 4027578,
      "rights": {
        "bp": 0,
        "elec": 0,
        "download": 0,
        "movie": 0,
        "pay": 0,
        "hd5": 0,
        "no_reprint": 1,
        "autoplay": 1,
        "ugc_pay": 0,
        "is_cooperation": 0,
        "ugc_pay_preview": 0,
        "no_background": 0,
        "arc_pay": 0,
        "pay_free_watch": 0
      },
      "owner": {
        "mid": 337521240,
        "name": "记录生活的蛋黄派",
        "face": "https://i0.hdslb.com/bfs/face/9ba6c7a0d3a2ebfe9db2f46219ece98e210d0269.jpg"
      },
      "stat": {
        "aid": 113990495701381,
        "view": 4684493,
        "danmaku": 1916,
        "reply": 1808,
        "favorite": 41734,
        "coin": 21513,
        "share": 15053,
        "now_rank": 0,
        "his_rank": 41,
        "like": 127888,
        "dislike": 0,
        "vt": 0,
        "vv": 4684493,
        "fav_g": 4755,
        "like_g": 536
      },
      "dynamic": "谢谢",
      "cid": 28353889668,
      "dimension": {
        "width": 3840,
        "height": 2160,
        "rotate": 0
      },
      "short_link_v2": "https://b23.tv/BV1ZCKVekEWY",
      "first_frame": "http://i0.hdslb.com/bfs/storyff/n250212sa29cuor4h356be26dtvaqmt3_firsti.jpg",
      "pub_location": "广东",
      "cover43": "",
      "tidv2": 2151,
      "tnamev2": "美食测评",
      "pid_v2": 1020,
      "pid_name_v2": "美食",
      "bvid": "BV1ZCKVekEWY",
      "season_type": 0,
      "is_ogv": false,
      "ogv_info": null,
      "rcmd_reason": "",
      "enable_vt": 0,
      "ai_rcmd": {
        "id": 113990495701381,
        "goto": "av",
        "trackid": "web_related_0.router-related-2479604-6dnm7.1774275919962.1000",
        "uniq_id": ""
      }
    },

暂时不考虑用来做什么

https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=355536702
获取用户自定义的收藏夹信息,只能用户自己用,应该带有身份验证,只能获取到用户自己的信息,其他人的拿不到
{
  "code": 0,
  "message": "OK",
  "ttl": 1,
  "data": {
    "count": 13,
    "list": [ 
      {
        "id": 209458502, 需要,收藏夹的id
        "fid": 2094585, 
        "mid": 355536702, 需要
        "attr": 1,
        "title": "默认收藏夹",  需要
        "fav_state": 0, 
        "media_count": 575  需要
      },
      {
https://api.bilibili.com/x/v3/fav/folder/created/list?up_mid=2067264637&ps=50&pn=1&web_location=333.1387
同样是获取收藏夹信息,但是这种可以获取任意up的收藏夹列表


https://api.bilibili.com/x/v3/fav/resource/list?media_id=209458502&pn=1&ps=10
获取收藏夹的视频的详细信息,media_id是上述收藏夹的id
{
  "code": 0,
  "message": "OK",
  "ttl": 1,
  "data": {
    "info": {
      "id": 209458502,
      "fid": 2094585,
      "mid": 355536702,
      "attr": 1,
      "title": "默认收藏夹",
      "cover": "http://i2.hdslb.com/bfs/archive/ee8fbefa6f2941cbb5bc3df5eca2a04d3264938f.jpg",
      "upper": {
        "mid": 355536702,
        "name": "是灵梦哟",
        "face": "https://i0.hdslb.com/bfs/face/22e99e43035c469b1ecd1be75bd3634f3e584316.jpg",
        "followed": false,
        "vip_type": 1,
        "vip_statue": 0
      },
      "cover_type": 2,
      "cnt_info": {
        "collect": 0,
        "play": 0,
        "thumb_up": 0,
        "share": 0
      },
      "type": 11,
      "intro": "",
      "ctime": 1533061751,
      "mtime": 1614079151,
      "state": 0,
      "fav_state": 0,
      "like_state": 0,
      "media_count": 575,
      "is_top": false
    },
    "medias": [
      {
        "id": 115857481012371, 需要
        "type": 2,
        "title": "【无授权转载】假吃系列", 需要
        "cover": "http://i2.hdslb.com/bfs/archive/ee8fbefa6f2941cbb5bc3df5eca2a04d3264938f.jpg", 需要
        "intro": "平台：You tu be\n无授权转载致歉\n作者：Kluna Tik 2\n平台：You tu be\n标题：Klunatik FAILED Cooking Class | Best Of 2020–2025 (3 Hours Mega Compilation)",需要
        "page": 1,
        "duration": 10965,
        "upper": {
          "mid": 667838098, 需要,用于知道这个视频是谁创建的
          "name": "聚化搞", 不需要
          "face": "https://i1.hdslb.com/bfs/face/604b8eba2049d4833cd39669b22488ad83e98dc1.jpg", 不需要
          "jump_link": ""
        },
        "attr": 0,
        "cnt_info": {
          "collect": 36414,
          "play": 706479,
          "danmaku": 2721,
          "vt": 0,
          "play_switch": 0,
          "reply": 0,
          "view_text_1": "70.6万"
        },
        "link": "bilibili://video/115857481012371",
        "ctime": 1767845571,
        "pubtime": 1767845570, 需要
        "fav_time": 1769867122,
        "bv_id": "BV13NiDBUEEY",
        "bvid": "BV13NiDBUEEY",
        "season": null,
        "ogv": null,
        "ugc": {
          "first_cid": 35255616961
        },
        "media_list_link": "bilibili://music/playlist/playpage/564995202?page_type=3&oid=115857481012371&otype=2"
      },...


https://api.bilibili.com/x/v3/fav/folder/collected/list?pn=1&ps=10&up_mid=355536702&platform=web
这是获取用户订阅的收藏夹信息,同样只能获取到用户自己的,其他人的无法获取
https://api.bilibili.com/x/v3/fav/folder/collected/list?up_mid=355536702&pn=1&ps=10&up_mid=&platform=web
这种方法也是,只能拿到自己订阅的收藏夹合集

{
  "code": 0,
  "message": "OK",
  "ttl": 1,
  "data": {
    "count": 138, 
    "list": [
      {
        "id": 4120617, 需要
        "fid": 0,
        "mid": 3546764705532638,
        "attr": 0,
        "attr_desc": "",
        "title": "东方栀子翻唱", 需要
        "cover": "https://archive.biliimg.com/bfs/archive/d848aca72df8a702846264c12386bee33b12addc.jpg",需要
        "upper": {
          "mid": 3546764705532638,需要,用于知道这个收藏夹是谁创建的
          "name": "菠萝吹吉太",
          "face": "",
          "jump_link": ""
        },
        "cover_type": 0,
        "intro": "全是栀子",需要
        "ctime": 0,
        "mtime": 1771585420,
        "state": 0,
        "fav_state": 1,
        "media_count": 11, 需要
        "view_count": 33153,
        "vt": 0,
        "is_top": false,
        "recent_fav": null,
        "play_switch": 0,
        "type": 21,
        "link": "bilibili://video/113413795614631?is_from_ugc_season=1",
        "bvid": ""
      },

https://api.bilibili.com/x/space/fav/season/list?season_id=4120617&pn=1&ps=10
获取订阅收藏夹的信息,这是别人创建的合集
{
  "code": 0,
  "message": "OK",
  "ttl": 1,
  "data": {
    "info": {
      "id": 4120617,
      "season_type": 1,
      "title": "东方栀子翻唱",
      "cover": "https://archive.biliimg.com/bfs/archive/d848aca72df8a702846264c12386bee33b12addc.jpg",
      "upper": {
        "mid": 3546764705532638,
        "name": "菠萝吹吉太"
      },
      "cnt_info": {
        "collect": 0,
        "play": 33153,
        "danmaku": 25,
        "vt": 0
      },
      "media_count": 11,
      "intro": "全是栀子",
      "enable_vt": 0
    },
    "medias": [
      {
        "id": 113413795614631, oid,暂时不需要,如果需要获取视频评论区的内容,就需要这个
        "title": "【东方栀子shine】For ya『喜欢你是我的秘密深度就像在海底十万米』【ACE cover】",需要
        "cover": "http://i0.hdslb.com/bfs/archive/4145c6f49bba1e3f4a158f7293a34d54afaf495b.jpg",需要
        "duration": 158, 需要
        "pubtime": 1730557671,需要
        "bvid": "BV1AkSqYCEKn",需要
        "upper": {
          "mid": 3546764705532638,需要
          "name": "菠萝吹吉太"
        },
        "cnt_info": {
          "collect": 167,
          "play": 4752,
          "danmaku": 3,
          "vt": 0
        },
        "enable_vt": 0,
        "vt_display": "",
        "is_self_view": false
      },
      {
        "id": 113355025024095,
        "title": "【东方栀子shine】你的脸上长出了一朵花【ACE cover】",
        "cover": "http://i2.hdslb.com/bfs/archive/1c3dd52cf84d943e041bd5b6125cd17935f087e9.jpg",
        "duration": 92,
        "pubtime": 1729660529,
        "bvid": "BV1Z4yZY1Edr",
        "upper": {
          "mid": 3546764705532638,
          "name": "菠萝吹吉太"
        },
        "cnt_info": {
          "collect": 175,
          "play": 4544,
          "danmaku": 0,
          "vt": 0
        },
        "enable_vt": 0,
        "vt_display": "",
        "is_self_view": false
      },


https://api.bilibili.com/x/relation/stat?vmid=196356191
获取指定用户的关注数量和粉丝数量
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "mid": 196356191,
    "following": 109,
    "whisper": 0,
    "black": 0,
    "follower": 4107437,
    "fans_medal_toast": null,
    "fans_effect": null
  }
}

https://api.bilibili.com/x/web-interface/search/all/v2?keyword=初音未来&page=1
这个用于搜索关键词获取得到的视频数据,现在暂时不需要
https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=%E5%88%9D%E9%9F%B3%E6%9C%AA%E6%9D%A5&page=1
同样是搜索视频,不过返回的数据有一些不同

https://api.bilibili.com/x/web-interface/dynamic/region?rid=3&pn=1&ps=10
获得某个分区的视频,不过目前并不知道分区的编号,暂时也不考虑

https://api.bilibili.com/x/web-interface/ranking?rid=3
获取某个分区动态近期最佳的非常多的视频信息,也许有一百个

给用户推荐视频可以通过这个,但是暂时用不上

https://api.bilibili.com/x/v2/reply/main?oid=${oid}&type=${type}`
可以获取视频的评论区,数据非常多且暂时不需要

https://api.bilibili.com/x/v1/dm/list.so?oid
失效了,或者参数不对