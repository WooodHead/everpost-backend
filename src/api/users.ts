import Router from '@koa/router';
import { User } from '@/entity/User';
import jwtValidate from '@/middleware/jwt-validate';
import { validateOrReject, MinLength } from 'class-validator';
import { Post } from '@/entity/Post';
import { PasswordAccountAccess } from '@/entity/PasswordAccountAccess';
import bcrypt from 'bcrypt';

const router = new Router();

router
  .post('/users', async ctx => {
    interface CreateUserRequest {
      username: string;
      email: string;
      password: string;
    }

    class CreateUserRequestVertify {
      @MinLength(8)
      password: string;

      constructor(req: CreateUserRequest) {
        this.password = req.password;
      }
    }

    const loginRequest = ctx.request.body as CreateUserRequest;

    await validateOrReject(new CreateUserRequestVertify(loginRequest));

    const newUser = User.create({
      ...loginRequest,
    });

    await newUser.save();

    try {
      const newAcc = PasswordAccountAccess.create({
        user: newUser,
        password: loginRequest.password,
      });

      newAcc.password = await bcrypt.hash(
        newAcc.password,
        Number.parseInt(process.env.PASSWORD_SALT_ROUND),
      );

      await newAcc.save();

      ctx.body = {
        ...newUser,
      };
    } catch (e) {
      // AccountAccess 저장 중 오류 발생 시
      // 생성된 newUser 제거
      // TODO: 트랜젝션으로 전환 필요함
      await newUser.remove();
      throw e;
    }
  })
  .get('/users/me', jwtValidate(), async ctx => {
    const { id } = ctx.state.user;

    const user = await User.findOneOrFail(id); // 발견하지 못하면, error를 발생시킴

    ctx.body = {
      ...user,
    };
  })
  .get('/users/:id', async ctx => {
    const id: number = Number.parseInt(ctx.params.id);

    const user = await User.findOne(id);

    if (user) {
      ctx.body = {
        ...user,
      };
    } else {
      ctx.throw(404, 'User not found');
    }
  })
  .patch('/users/me', jwtValidate(), async ctx => {
    interface UpdateUserRequest {
      username: string | null;
      email: string | null;
      profileImage: string | null;
    }

    const { id } = ctx.state.user;
    const update = ctx.request.body as UpdateUserRequest;

    const user = await User.findOneOrFail(id); // 발견하지 못하면, error를 발생시킴

    user.username = update.username;
    user.email = update.email || user.email;
    user.profileImage = update.profileImage || user.profileImage;

    await user.save();

    ctx.body = {
      ...user,
    };
  })
  .delete('/users/me', jwtValidate(), async ctx => {
    const { id } = ctx.state.user;

    const result = await User.delete(id);

    if (result.affected > 0) {
      console.log('Removed user: ' + id);

      ctx.body = {
        message: 'delete success',
      };
    } else {
      ctx.throw(404, 'User not found!');
    }
  })
  .get('/users/me/posts', jwtValidate(), async ctx => {
    const { id } = ctx.state.user;

    interface PostPaginationRequest {
      page: number;
      size: number;
    }

    const req = ctx.query as PostPaginationRequest;

    const size = req.size || 20;
    const offset = req.page ? (req.page - 1) * size : 0;

    const [contents, count] = await Post.createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .where('user.id = :id', { id })
      .orderBy('post.createDate')
      .offset(offset)
      .limit(size)
      .getManyAndCount();

    ctx.body = {
      meta: {
        page: req.page || 0,
        count: count,
        maxCount: size,
      },
      documents: contents,
    };
  });

export default router;
